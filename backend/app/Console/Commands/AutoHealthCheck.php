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
    protected $description = 'Автоматическая проверка всех стеков';

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

        // Получаем все стеки из БД
        $sandboxes = Sandbox::all();

        if ($sandboxes->isEmpty()) {
            $this->info('Нет стеков для проверки');
            return;
        }

        foreach ($sandboxes as $sandbox) {
            $this->checkStack($sandbox);
        }

        $this->info('Проверка завершена');
    }

    private function checkStack($sandbox)
    {
        $this->line("Проверка стека: {$sandbox->name}");

        try {
            // Получаем контейнеры стека
            $containers = $this->dockerAgent->getContainersByStack($sandbox->name);

            $isAvailable = true;
            $errorMessage = null;
            $responseTime = 0;

            if (empty($containers)) {
                $isAvailable = false;
                $errorMessage = 'Контейнеры не найдены';
            } else {
                // Проверяем каждый контейнер
                foreach ($containers as $container) {
                    if ($container['state'] !== 'running') {
                        $isAvailable = false;
                        $errorMessage = "Контейнер {$container['name']} не работает";
                        break;
                    }
                }
            }

            // Сохраняем результат проверки
            HealthCheck::create([
                'sandbox_id' => $sandbox->id,
                'is_available' => $isAvailable,
                'response_time' => $responseTime,
                'error_message' => $errorMessage
            ]);

            if ($isAvailable) {
                $this->line("✅ {$sandbox->name} - работает");
            } else {
                $this->warn("⚠️ {$sandbox->name} - {$errorMessage}");
            }

        } catch (\Exception $e) {
            Log::error('Ошибка проверки стека: ' . $e->getMessage());
            $this->error("Ошибка при проверке {$sandbox->name}: " . $e->getMessage());

            // Сохраняем ошибку
            HealthCheck::create([
                'sandbox_id' => $sandbox->id,
                'is_available' => false,
                'response_time' => 0,
                'error_message' => $e->getMessage()
            ]);
        }
    }
}
