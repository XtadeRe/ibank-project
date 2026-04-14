<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreSandboxRequest;
use App\Http\Resources\SandboxResource;
use App\Models\HealthCheck;
use App\Models\History;
use App\Models\Sandbox;
use App\Services\DockerAgentService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class SandboxController extends Controller
{
    private $dockerAgent;

    public function __construct()
    {
        $this->dockerAgent = new DockerAgentService(env('DOCKER_AGENT_URL', 'http://host.docker.internal:3001'));
    }

    /**
     * Получить все стеки
     */
    public function index()
    {
        try {
            $sandboxes = Sandbox::all();
            return SandboxResource::collection($sandboxes);
        } catch (\Exception $e) {
            Log::error('Ошибка получения стеков: ' . $e->getMessage());
            return response()->json(['error' => 'Ошибка получения стеков'], 500);
        }
    }

    /**
     * Создать новый стек
     */
    public function store(StoreSandboxRequest $request)
    {
        try {
            DB::beginTransaction();

            $sandbox = Sandbox::create([
                'name' => $request->name,
                'git_branch' => $request->git_branch,
                'stack_type' => $request->stack_type,
                'machine_ip' => $request->machine_ip,
                'status' => 'deploying',
                'version' => 'v1.0.0',
                'last_deployed' => now(),
            ]);

            History::log(
                $sandbox->id,
                'create',
                "Создан стек {$sandbox->name} из ветки {$request->git_branch}"
            );

            $result = $this->dockerAgent->startStack(
                $sandbox->name,
                $sandbox->git_branch,
                $sandbox->stack_type
            );

            if ($result['success']) {
                $sandbox->status = 'running';
                $sandbox->save();

                History::log(
                    $sandbox->id,
                    'start',
                    "Стек {$sandbox->name} успешно запущен"
                );

                DB::commit();

                return response()->json([
                    'message' => 'Стек успешно создан и запущен',
                    'sandbox' => new SandboxResource($sandbox),
                    'docker_output' => $result['data']
                ], 201);
            } else {
                $sandbox->status = 'failed';
                $sandbox->save();

                History::log(
                    $sandbox->id,
                    'create',
                    "Ошибка запуска: " . ($result['error'] ?? 'Неизвестная ошибка')
                );

                DB::commit();

                return response()->json([
                    'message' => 'Стек создан в БД, но не запустился в Docker',
                    'sandbox' => new SandboxResource($sandbox),
                    'error' => $result['error'] ?? 'Неизвестная ошибка'
                ], 500);
            }

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Ошибка создания стека: ' . $e->getMessage());

            return response()->json([
                'message' => 'Ошибка при создании стека',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function restart($id)
    {
        try {
            $sandbox = Sandbox::findOrFail($id); // Находит песочницу или выбрасывает 404

            Log::info("Попытка перезапуска стека: {$sandbox->name} (ID: {$id})");

            // Вызываем метод в сервисе для перезапуска через Docker Agent
            $result = $this->dockerAgent->restartStack($sandbox->name);

            if ($result['success']) {
                // Логируем успешный перезапуск
                History::log(
                    $sandbox->id,
                    'restart',
                    "Стек {$sandbox->name} успешно перезапущен"
                );

                return response()->json([
                    'success' => true,
                    'message' => 'Стек успешно перезапущен',
                    'sandbox' => new SandboxResource($sandbox),
                    'data' => $result // Возвращаем данные от агента, если нужно
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Ошибка перезапуска стека',
                    'error' => $result['error'] ?? 'Неизвестная ошибка',
                    'sandbox' => new SandboxResource($sandbox),
                ], 500);
            }

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::error("Песочница с ID {$id} не найдена.");
            return response()->json([
                'success' => false,
                'error' => 'Песочница не найдена'
            ], 404);
        } catch (\Exception $e) {
            Log::error('Ошибка перезапуска стека: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Получить ветки Git
     */
    public function getBranches()
    {
        try {
            $branches = $this->dockerAgent->getBranches();

            return response()->json([
                'success' => true,
                'branches' => $branches
            ]);
        } catch (\Exception $e) {
            Log::error('Ошибка получения веток: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
                'branches' => ['master', 'develop']
            ], 500);
        }
    }

    /**
     * Получить статистику доступности
     */
    public function uptime($id) // Renamed from getUptimeStats to uptime
    {
        $cacheKey = "uptime_data_{$id}"; // Уникальный ключ кэша для каждого стека
        $cacheTimeoutSeconds = 55; // Кэшируем на 55 секунд (чуть меньше, чем интервал опроса)

        // Попробуем получить данные из кэша
        $cachedResult = Cache::get($cacheKey);

        if ($cachedResult !== null) {
            Log::debug("Uptime data for sandbox {$id} served from cache.");
            return response()->json($cachedResult);
        }

        try {
            $sandbox = Sandbox::where('id', $id)->orWhere('name', $id)->first();

            if (!$sandbox) {
                return response()->json([
                    'success' => false,
                    'error' => 'Стек не найден'
                ], 404);
            }

            // --- Кэширование вычислений ---
            $cacheKeyChecks = "uptime_checks_{$id}";
            $checksData = Cache::remember($cacheKeyChecks, 60, function() use ($sandbox) { // Кэшируем на 1 минуту
                $lastDay = now()->subDay();
                $dayChecks = $sandbox->healthChecks()
                    ->where('created_at', '>=', $lastDay)
                    ->get();

                $lastWeek = now()->subDays(7);
                $weekChecks = $sandbox->healthChecks()
                    ->where('created_at', '>=', $lastWeek)
                    ->get();

                $lastMonth = now()->subDays(30);
                $monthChecks = $sandbox->healthChecks()
                    ->where('created_at', '>=', $lastMonth)
                    ->get();

                return [
                    'day' => $dayChecks,
                    'week' => $weekChecks,
                    'month' => $monthChecks,
                    'total_count' => $sandbox->healthChecks()->count()
                ];
            });

            $uptime = [
                'day' => $this->calculateUptime($checksData['day']),
                'week' => $this->calculateUptime($checksData['week']),
                'month' => $this->calculateUptime($checksData['month']),
            ];

            $chartData = $this->getChartData($sandbox);

            $result = [
                'success' => true,
                'uptime' => $uptime,
                'chart' => $chartData,
                'total_checks' => $checksData['total_count'],
            ];

            // Сохраняем результат в кэш
            Cache::put($cacheKey, $result, $cacheTimeoutSeconds);

            return response()->json($result);

        } catch (\Exception $e) {
            // Не кэшируем ошибки
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Проверить здоровье стека
     */
    public function checkHealth($id)
    {
        try {
            $sandbox = Sandbox::findOrFail($id);
            $containers = $this->dockerAgent->getContainersByStack($sandbox->name);

            $isAvailable = true;
            $errorMessage = null;

            foreach ($containers as $container) {
                if ($container['state'] !== 'running') {
                    $isAvailable = false;
                    $errorMessage = "Контейнер {$container['name']} не работает";
                    break;
                }
            }

            $healthCheck = HealthCheck::create([
                'sandbox_id' => $sandbox->id,
                'is_available' => $isAvailable,
                'response_time' => 0,
                'error_message' => $errorMessage
            ]);

            $stats = HealthCheck::getUptimeStats($sandbox->id, 24);

            return response()->json([
                'success' => true,
                'message' => $isAvailable ? 'Стек доступен' : 'Стек недоступен',
                'check' => $healthCheck,
                'stats' => $stats,
                'containers' => $containers
            ]);

        } catch (\Exception $e) {
            Log::error('Ошибка проверки стека: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Вспомогательные методы
     */
    private function calculateUptime($checks)
    {
        if ($checks->isEmpty()) {
            return 0;
        }

        $available = $checks->where('is_available', true)->count();
        $total = $checks->count();

        return round(($available / $total) * 100, 2);
    }

    private function getChartData($sandbox)
    {
        // Этот метод можно также кэшировать, если он дорогой
        $cacheKeyChart = "uptime_chart_{$sandbox->id}";
        return Cache::remember($cacheKeyChart, 60, function() use ($sandbox) { // Кэшируем на 1 минуту
            $checks = $sandbox->healthChecks()
                ->where('created_at', '>=', now()->subHours(24))
                ->orderBy('created_at', 'asc')
                ->get();

            $chartData = [];
            $now = now();

            for ($i = 23; $i >= 0; $i--) {
                $hourStart = $now->copy()->subHours($i)->startOfHour();
                $hourEnd = $now->copy()->subHours($i)->endOfHour();

                $hourChecks = $checks->filter(function($check) use ($hourStart, $hourEnd) {
                    return $check->created_at >= $hourStart && $check->created_at <= $hourEnd;
                });

                $total = $hourChecks->count();
                $available = $hourChecks->where('is_available', true)->count();
                $uptime = ($total > 0) ? round(($available / $total) * 100, 2) : 0;

                $chartData[] = [
                    'hour' => $hourStart->format('H:00'),
                    'uptime' => $uptime,
                    'checks' => $total,
                    'available' => $available,
                    'failed' => $total - $available,
                    'timestamp' => $hourStart->timestamp,
                    'isCurrentHour' => ($i === 0)
                ];
            }

            return $chartData;
        });
    }
}
