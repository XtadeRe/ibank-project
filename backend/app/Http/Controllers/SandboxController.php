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

class SandboxController extends Controller
{
    private $dockerAgent;

    public function __construct()
    {
        $this->dockerAgent = new DockerAgentService('http://localhost:3001');
    }

    /**
     * ПОЛУЧИТЬ ВСЕ СТЕКИ
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

    public function store(StoreSandboxRequest $request)
    {
        try {
            DB::beginTransaction();

            // Проверяем доступность Docker Agent
            $ping = $this->dockerAgent->ping();
            if (!$ping) {
                return response()->json([
                    'message' => 'Docker Agent недоступен'
                ], 503);
            }

            // Создаем запись в БД
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

            // Запускаем стек через Docker Agent
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

            if (isset($sandbox)) {
                History::log(
                    $sandbox->id,
                    'create',
                    "Ошибка: " . $e->getMessage()
                );
            }

            Log::error('Ошибка создания стека: ' . $e->getMessage());

            return response()->json([
                'message' => 'Ошибка при создании стека',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Перезапустить стек
     */
    public function restart($id)
    {
        try {
            $sandbox = Sandbox::findOrFail($id);
            History::log(
                $sandbox->id,
                'restart',
                "Начало перезапуска стека {$sandbox->name}"
            );

            // Удаляем стек (останавливаем контейнеры)
            $stopResult = $this->dockerAgent->deleteStack($sandbox->name);

            if (!($stopResult['success'] ?? false)) {
                History::log(
                    $sandbox->id,
                    'restart',
                    "Ошибка остановки стека {$sandbox->name} перед перезапуском"
                );

                return response()->json([
                    'message' => 'Не удалось остановить стек перед перезапуском',
                    'error' => $stopResult['error'] ?? 'Unknown error'
                ], 500);
            }

            sleep(2);

            // Запускаем стек заново
            $startResult = $this->dockerAgent->startStack(
                $sandbox->name,
                $sandbox->git_branch,
                $sandbox->stack_type
            );

            if ($startResult['success'] ?? false) {
                $sandbox->status = 'running';
                $sandbox->save();

                History::log(
                    $sandbox->id,
                    'restart',
                    "Стек {$sandbox->name} успешно перезапущен"
                );

                return response()->json([
                    'message' => 'Стек перезапущен',
                    'sandbox' => new SandboxResource($sandbox)
                ]);
            }

            $sandbox->status = 'failed';
            $sandbox->save();

            History::log(
                $sandbox->id,
                'restart',
                "Стек {$sandbox->name} остановлен, но не запустился: " . ($startResult['error'] ?? 'Неизвестная ошибка')
            );

            return response()->json([
                'message' => 'Стек остановлен, но не запустился',
                'sandbox' => new SandboxResource($sandbox),
                'error' => $startResult['error'] ?? 'Неизвестная ошибка'
            ], 500);

        } catch (\Exception $e) {
            Log::error('Ошибка перезапуска стека: ' . $e->getMessage());

            if (isset($sandbox) && $sandbox->id) {
                History::log(
                    $sandbox->id,
                    'restart',
                    "Ошибка перезапуска стека: " . $e->getMessage()
                );
            }

            return response()->json([
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ], 500);
        }
    }

    /**
     * Переопределяем метод destroy для удаления из Docker
     */
    public function destroy($id)
    {
        try {
            $sandbox = Sandbox::findOrFail($id);

            // Удаляем стек из Docker
            $this->dockerAgent->deleteStack($sandbox->name);

            // Удаляем из БД
            $sandbox->delete();
            History::log(
                $sandbox->id,
                'delete',
                "Удаление стека {$sandbox->name} прошло успешно"
            );
            return response()->json([
                'message' => 'Стек успешно удален'
            ]);

        } catch (\Exception $e) {
            Log::error('Ошибка удаления стека: ' . $e->getMessage());
            History::log(
                $sandbox->id,
                'delete',
                "При удалении стека {$sandbox->name} произошла ошибка:" . $e->getMessage()
            );
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function getBranches()
    {
        try {
            // Используем существующий метод из DockerAgentService
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
                'branches' => ['master', 'develop'] // Запасной вариант
            ], 500);
        }
    }

    public function getUptimeStats($id)
    {
        try {
            // Ищем стек по ID или по имени
            $sandbox = Sandbox::where('id', $id)->orWhere('name', $id)->first();

            if (!$sandbox) {
                return response()->json([
                    'success' => false,
                    'error' => 'Стек не найден'
                ], 404);
            }

            // Статистика за последние 24 часа
            $lastDay = now()->subDay();
            $dayChecks = $sandbox->healthChecks()
                ->where('created_at', '>=', $lastDay)
                ->get();

            $dayUptime = $this->calculateUptime($dayChecks);

            // Статистика за последние 7 дней
            $lastWeek = now()->subDays(7);
            $weekChecks = $sandbox->healthChecks()
                ->where('created_at', '>=', $lastWeek)
                ->get();

            $weekUptime = $this->calculateUptime($weekChecks);

            // Статистика за последние 30 дней
            $lastMonth = now()->subDays(30);
            $monthChecks = $sandbox->healthChecks()
                ->where('created_at', '>=', $lastMonth)
                ->get();

            $monthUptime = $this->calculateUptime($monthChecks);

            // Данные для графика (по часам за последние 24 часа)
            $chartData = $this->getChartData($sandbox);

            return response()->json([
                'success' => true,
                'uptime' => [
                    'day' => $dayUptime,
                    'week' => $weekUptime,
                    'month' => $monthUptime,
                ],
                'chart' => $chartData,
                'total_checks' => $sandbox->healthChecks()->count(),
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

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
        // Получаем проверки за последние 24 часа
        $checks = $sandbox->healthChecks()
            ->where('created_at', '>=', now()->subHours(24))
            ->orderBy('created_at', 'asc')
            ->get();

        // Создаем массив из 24 часов, где последний элемент - текущий час
        $chartData = [];
        $now = now();

        // Идем от 23 часов назад до текущего часа
        for ($i = 23; $i >= 0; $i--) {
            $hourStart = $now->copy()->subHours($i)->startOfHour();
            $hourEnd = $now->copy()->subHours($i)->endOfHour();

            // Название часа (например "15:00")
            $hourLabel = $hourStart->format('H:00');

            // Фильтруем проверки за этот час
            $hourChecks = $checks->filter(function($check) use ($hourStart, $hourEnd) {
                return $check->created_at >= $hourStart && $check->created_at <= $hourEnd;
            });

            $total = $hourChecks->count();
            $available = $hourChecks->where('is_available', true)->count();
            $uptime = ($total > 0) ? round(($available / $total) * 100, 2) : 0;

            $chartData[] = [
                'hour' => $hourLabel,
                'uptime' => $uptime,
                'checks' => $total,
                'available' => $available,
                'failed' => $total - $available,
                'timestamp' => $hourStart->timestamp,
                'isCurrentHour' => ($i === 0) // Помечаем текущий час
            ];
        }

        return $chartData;
    }


    public function checkHealth($id)
    {
        try {
            $sandbox = Sandbox::findOrFail($id);

            // Получаем контейнеры стека
            $containers = $this->dockerAgent->getContainersByStack($sandbox->name);

            $isAvailable = true;
            $errorMessage = null;
            $responseTime = 0;

            // Проверяем каждый контейнер
            foreach ($containers as $container) {
                if ($container['state'] !== 'running') {
                    $isAvailable = false;
                    $errorMessage = "Контейнер {$container['name']} не работает";
                    break;
                }
            }

            // Сохраняем результат
            $healthCheck = HealthCheck::create([
                'sandbox_id' => $sandbox->id,
                'is_available' => $isAvailable,
                'response_time' => $responseTime,
                'error_message' => $errorMessage
            ]);

            // Получаем обновленную статистику
            $stats = HealthCheck::getUptimeStats($sandbox->id, 24);

            History::log(
                $sandbox->id,
                'health check',
                "Проверка доступности стека. Стек {$sandbox->name} доступен"
            );

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
}
