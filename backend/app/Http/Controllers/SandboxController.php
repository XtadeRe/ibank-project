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
    public function getUptimeStats($id)
    {
        try {
            $sandbox = Sandbox::where('id', $id)->orWhere('name', $id)->first();

            if (!$sandbox) {
                return response()->json([
                    'success' => false,
                    'error' => 'Стек не найден'
                ], 404);
            }

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

            $chartData = $this->getChartData($sandbox);

            return response()->json([
                'success' => true,
                'uptime' => [
                    'day' => $this->calculateUptime($dayChecks),
                    'week' => $this->calculateUptime($weekChecks),
                    'month' => $this->calculateUptime($monthChecks),
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
    }
}
