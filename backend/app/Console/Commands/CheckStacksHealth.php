<?php

namespace App\Console\Commands;

use App\Models\HealthCheck;
use App\Models\Sandbox;
use App\Services\DockerAgentService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CheckStacksHealth extends Command
{
    protected $signature = 'stacks:check-health';
    protected $description = 'Проверка доступности всех стеков';

    private $dockerAgent;

    public function __construct()
    {
        parent::__construct();
        $this->dockerAgent = new DockerAgentService('http://localhost:3001');
    }

    public function handle()
    {
        $this->info('Начинаю проверку стеков...');

        $sandboxes = Sandbox::where('status', 'running')->get();

        foreach ($sandboxes as $sandbox) {
            $this->checkStackHealth($sandbox);
        }

        $this->info('Проверка завершена');
    }

    private function checkStackHealth($sandbox)
    {
        try {
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

                // Пытаемся сделать HTTP-запрос к контейнеру (если есть открытый порт)
                try {
                    $start = microtime(true);
                    // Здесь нужно определить порт для проверки
                    $response = Http::timeout(2)->get('http://localhost:8080'); // Пример
                    $responseTime = round((microtime(true) - $start) * 1000);

                    if (!$response->successful()) {
                        $isAvailable = false;
                        $errorMessage = "HTTP ошибка: " . $response->status();
                    }
                } catch (\Exception $e) {
                    // Если нет HTTP сервиса, считаем по статусу контейнера
                    $responseTime = 0;
                }
            }

            // Сохраняем результат проверки
            HealthCheck::create([
                'sandbox_id' => $sandbox->id,
                'is_available' => $isAvailable,
                'response_time' => $responseTime,
                'error_message' => $errorMessage
            ]);

            $this->line("Стек {$sandbox->name}: " . ($isAvailable ? '✅' : '❌'));

        } catch (\Exception $e) {
            Log::error('Ошибка проверки стека: ' . $e->getMessage());

            HealthCheck::create([
                'sandbox_id' => $sandbox->id,
                'is_available' => false,
                'error_message' => 'Ошибка проверки: ' . $e->getMessage()
            ]);
        }
    }
}
