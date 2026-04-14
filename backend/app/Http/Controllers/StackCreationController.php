<?php
// app/Http/Controllers/StackCreationController.php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http; // Используем Laravel HTTP клиент для запросов к Docker Agent

class StackCreationController extends Controller
{
    protected $dockerAgentBaseUrl;

    public function __construct()
    {
        // Получаем URL Docker Agent из .env или используем стандартный
        $this->dockerAgentBaseUrl = env('DOCKER_AGENT_URL', 'http://host.docker.internal:3001');
    }

    public function getAvailableBranches(Request $request)
    {
        try {
            // Используем новый эндпоинт Docker Agent
            $response = Http::timeout(30)->get($this->dockerAgentBaseUrl . '/api/repo/branches'); // Обновлённый URL

            if ($response->successful()) {
                $branches = $response->json('data', []); // Предполагаем, что ответ { "data": [...] } как в старом контроллере
                return response()->json(['success' => true, 'branches' => $branches], 200);
            } else {
                \Log::error('Docker Agent failed to fetch branches: ' . $response->body());
                return response()->json(['success' => false, 'error' => 'Could not fetch branches from agent'], 500);
            }

        } catch (\Exception $e) {
            \Log::error('Exception fetching branches: ' . $e->getMessage());
            return response()->json(['success' => false, 'error' => 'Internal server error'], 500);
        }
    }

    public function createStack(Request $request)
    {
        $validated = $request->validate([
            'branch' => 'required|string',
            'stack_type' => 'required|string|in:full,java,backend,db', // Обновленные типы
            'stack_name' => 'required|string|regex:/^[a-z0-9-]{3,30}$/',
            'machine_ip' => 'sometimes|string' // Может быть опциональным или не передаваться
        ]);

        $branch = $validated['branch'];
        $stackType = $validated['stack_type'];
        $stackName = $validated['stack_name'];
        // $machineIp = $validated['machine_ip'] ?? '127.0.0.1'; // Не используется напрямую здесь

        try {
            // Подготовим данные для отправки в Docker Agent
            $agentPayload = [
                'branch' => $branch,
                'stack_type' => $stackType, // Используем новое имя поля
                'stack_name' => $stackName,
                // ... другие необходимые параметры, которые понимает Docker Agent
            ];

            // Отправляем запрос в Docker Agent на новый эндпоинт
            $response = Http::timeout(120) // Увеличьте таймаут, так как запуск может занять время
            ->post($this->dockerAgentBaseUrl . '/api/stacks/start', $agentPayload); // Обновлённый URL

            if ($response->successful()) {
                $result = $response->json(); // Предполагаем, что агент возвращает { "success": true, ... }
                return response()->json($result, 200);
            } else {
                \Log::error('Docker Agent failed to start stack: ' . $response->body());
                return response()->json(['success' => false, 'error' => 'Agent reported an error: ' . $response->body()], 500);
            }

        } catch (\Exception $e) {
            \Log::error('Exception starting stack: ' . $e->getMessage());
            return response()->json(['success' => false, 'error' => 'Internal server error'], 500);
        }
    }
}
