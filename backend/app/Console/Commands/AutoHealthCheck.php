<?php

namespace App\Console\Commands;

use App\Models\HealthCheck;
use App\Models\Sandbox;
use App\Services\DockerAgentService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class AutoHealthCheck extends Command
{
    protected $signature = 'stacks:auto-check';
    protected $description = 'Автоматическая проверка и восстановление стеков';

    private $dockerAgent;

    public function __construct()
    {
        parent::__construct();
        $this->dockerAgent = new DockerAgentService(env('DOCKER_AGENT_URL', 'http://host.docker.internal:3001'));
    }

    public function handle()
    {
        // Записываем время последнего запуска
        Cache::put('auto_check_last_run', now(), 86400);

        $this->info('Запуск автоматической проверки стеков...');

        // Получаем все стеки
        $sandboxes = Sandbox::all();

        if ($sandboxes->isEmpty()) {
            $this->info('Нет стеков для проверки');
            return;
        }

        foreach ($sandboxes as $sandbox) {
            $this->checkAndRestore($sandbox);
        }

        $this->info('Проверка завершена');
    }

    private function checkAndRestore($sandbox)
    {
        $this->line("Проверка стека: {$sandbox->name}");

        try {
            // Получаем контейнеры стека
            $containers = $this->dockerAgent->getContainersByStack($sandbox->name);

            $isAvailable = true;
            $errorMessage = null;
            $failedContainers = [];

            if (empty($containers)) {
                $isAvailable = false;
                $errorMessage = 'Контейнеры не найдены';
            } else {
                foreach ($containers as $container) {
                    if ($container['state'] !== 'running') {
                        $isAvailable = false;
                        $failedContainers[] = $container['name'];
                    }
                }
                if (!$isAvailable) {
                    $errorMessage = 'Контейнеры не работают: ' . implode(', ', $failedContainers);
                }
            }

            // Сохраняем результат проверки
            $healthCheck = HealthCheck::create([
                'sandbox_id' => $sandbox->id,
                'is_available' => $isAvailable,
                'response_time' => 0,
                'error_message' => $errorMessage
            ]);

            if (!$isAvailable) {
                $this->warn("⚠️ {$sandbox->name} - {$errorMessage}");
                $this->attemptRecovery($sandbox);
            } else {
                $this->line("✅ {$sandbox->name} - работает");
            }

        } catch (\Exception $e) {
            $this->error("Ошибка при проверке {$sandbox->name}: " . $e->getMessage());

            HealthCheck::create([
                'sandbox_id' => $sandbox->id,
                'is_available' => false,
                'response_time' => 0,
                'error_message' => $e->getMessage()
            ]);
        }
    }

    private function attemptRecovery($sandbox)
    {
        // Проверяем последние 3 проверки
        $lastChecks = HealthCheck::where('sandbox_id', $sandbox->id)
            ->orderBy('created_at', 'desc')
            ->take(3)
            ->get();

        $failures = $lastChecks->where('is_available', false)->count();

        // Если 3 раза подряд ошибка - пробуем восстановить
        if ($failures >= 3) {
            $this->warn("🔄 Попытка восстановления стека {$sandbox->name}...");

            try {
                // Перезапускаем стек
                $this->dockerAgent->deleteStack($sandbox->name);
                sleep(2);
                $result = $this->dockerAgent->startStack(
                    $sandbox->name,
                    $sandbox->git_branch,
                    $sandbox->stack_type
                );

                if ($result['success']) {
                    $sandbox->status = 'running';
                    $sandbox->save();

                    Log::info("Стек {$sandbox->name} успешно восстановлен");
                    $this->info("✅ Стек {$sandbox->name} восстановлен");

                    // Записываем успешное восстановление
                    HealthCheck::create([
                        'sandbox_id' => $sandbox->id,
                        'is_available' => true,
                        'response_time' => 0,
                        'error_message' => 'Стек восстановлен автоматически'
                    ]);
                } else {
                    $this->error("❌ Не удалось восстановить {$sandbox->name}: " . ($result['error'] ?? 'Неизвестная ошибка'));
                    Log::error("Ошибка восстановления стека {$sandbox->name}: " . ($result['error'] ?? 'Неизвестная ошибка'));
                }

            } catch (\Exception $e) {
                $this->error("❌ Ошибка при восстановлении: " . $e->getMessage());
                Log::error("Ошибка восстановления стека {$sandbox->name}: " . $e->getMessage());
            }
        } else {
            $this->line("   (неудачных проверок: {$failures}/3, восстановление не требуется)");
        }
    }
}
