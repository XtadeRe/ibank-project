<?php

namespace App\Console\Commands;

use App\Models\HealthCheck;
use App\Models\Incident;
use App\Models\Sandbox;
use App\Services\DockerAgentService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class AutoHealthCheck extends Command
{
    protected $signature = 'stacks:auto-check';
    protected $description = 'Автоматическая проверка всех стеков и восстановление при сбоях';

    private $dockerAgent;

    public function __construct()
    {
        parent::__construct();
        $this->dockerAgent = new DockerAgentService('http://localhost:3001');
    }

    public function handle()
    {
        $this->info('Запуск автоматической проверки стеков...');

        $sandboxes = Sandbox::whereIn('status', ['running', 'partial'])->get();

        foreach ($sandboxes as $sandbox) {
            $this->checkAndRestore($sandbox);
        }

        $this->info('Проверка завершена');
    }

    private function checkAndRestore($sandbox)
    {
        $this->line("Проверка стека: {$sandbox->name}");

        // Получаем контейнеры
        $containers = $this->dockerAgent->getContainersByStack($sandbox->name);

        if (empty($containers)) {
            $this->handleFailure($sandbox, 'Контейнеры не найдены');
            return;
        }

        $allRunning = true;
        $failedContainers = [];

        foreach ($containers as $container) {
            if ($container['state'] !== 'running') {
                $allRunning = false;
                $failedContainers[] = $container['name'];
            }
        }

        // Сохраняем результат проверки
        HealthCheck::create([
            'sandbox_id' => $sandbox->id,
            'is_available' => $allRunning,
            'error_message' => $allRunning ? null : implode(', ', $failedContainers)
        ]);

        if (!$allRunning) {
            $this->handleFailure($sandbox, 'Контейнеры не работают: ' . implode(', ', $failedContainers));
        } else {
            $this->line("{$sandbox->name} - всё работает");
        }
    }

    private function handleFailure($sandbox, $message)
    {
        $this->warn("{$sandbox->name} - {$message}");

        // Проверяем последние 3 проверки
        $lastChecks = HealthCheck::where('sandbox_id', $sandbox->id)
            ->orderBy('created_at', 'desc')
            ->take(3)
            ->get();

        $failures = $lastChecks->where('is_available', false)->count();

        // Если 3 раза подряд ошибка - пробуем восстановить
        if ($failures >= 3) {
            $this->attemptRecovery($sandbox);
        }
    }

    private function attemptRecovery($sandbox)
    {
        $this->warn("Попытка восстановления стека {$sandbox->name}...");

        // Логируем инцидент
        $incident = Incident::create([
            'sandbox_id' => $sandbox->id,
            'type' => 'auto_recovery',
            'severity' => 'high',
            'message' => "Автоматическое восстановление после 3 неудачных проверок",
            'resolved' => false
        ]);

        try {
            // Перезапускаем стек
            $result = $this->dockerAgent->deleteStack($sandbox->name);
            sleep(2);
            $result = $this->dockerAgent->startStack(
                $sandbox->name,
                $sandbox->git_branch,
                $sandbox->stack_type
            );

            if ($result['success']) {
                $sandbox->status = 'running';
                $sandbox->save();

                $incident->resolved = true;
                $incident->resolved_at = now();
                $incident->save();

                Log::info('Стек успешно восстановлен', ['name' => $sandbox->name]);
                $this->info("Стек {$sandbox->name} восстановлен");
            } else {
                $incident->message .= " Ошибка восстановления: " . ($result['error'] ?? 'Неизвестная ошибка');
                $incident->save();

                Log::error('Ошибка восстановления стека', ['name' => $sandbox->name]);
                $this->error("Не удалось восстановить {$sandbox->name}");
            }

        } catch (\Exception $e) {
            $incident->message .= " Исключение: " . $e->getMessage();
            $incident->save();

            Log::error('Ошибка при восстановлении', ['error' => $e->getMessage()]);
            $this->error("Ошибка: " . $e->getMessage());
        }
    }
}
