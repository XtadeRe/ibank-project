<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class StackController extends Controller
{
    private $dockerAgentUrl;

    public function __construct()
    {
        $this->dockerAgentUrl = env('DOCKER_AGENT_URL', 'http://host.docker.internal:3001');
    }

    /**
     * Получить список всех стеков из Docker Agent
     */
    public function index()
    {
        try {
            $response = Http::timeout(10)->get($this->dockerAgentUrl . '/api/stacks');

            if ($response->successful()) {
                $data = $response->json();
                return response()->json([
                    'success' => true,
                    'stacks' => $data['stacks'] ?? []
                ]);
            }

            return response()->json([
                'success' => false,
                'error' => 'Failed to fetch stacks',
                'stacks' => []
            ], 200); // Возвращаем 200, но с пустым массивом
        } catch (\Exception $e) {
            \Log::error('Docker Agent error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
                'stacks' => []
            ], 200); // Возвращаем 200, чтобы фронтенд не падал
        }
    }

    /**
     * Получить информацию о конкретном стеке
     */
    public function show($name)
    {
        try {
            $response = Http::timeout(10)->get($this->dockerAgentUrl . '/api/stacks/' . $name . '/info');

            if ($response->successful()) {
                return response()->json($response->json());
            }

            return response()->json([
                'success' => false,
                'error' => 'Stack not found'
            ], 404);
        } catch (\Exception $e) {
            \Log::error('Docker Agent error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Создать новый стек через Docker Agent
     */
    public function store(Request $request)
    {
        try {
            $response = Http::timeout(60)->post($this->dockerAgentUrl . '/api/stacks/' . $request->name . '/create', [
                'stackType' => $request->stack_type,
                'git_branch' => $request->git_branch ?? 'develop'
            ]);

            if ($response->successful()) {
                return response()->json($response->json());
            }

            return response()->json([
                'success' => false,
                'error' => 'Failed to create stack'
            ], 500);
        } catch (\Exception $e) {
            \Log::error('Docker Agent error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Удалить стек через Docker Agent
     */
    public function destroy($name)
    {
        try {
            \Log::info('Удаление стека: ' . $name);

            $response = Http::timeout(30)->post($this->dockerAgentUrl . '/api/stacks/' . $name . '/delete');

            \Log::info('Ответ от Docker Agent', [
                'status' => $response->status(),
                'body' => $response->body()
            ]);

            if ($response->successful()) {
                return response()->json($response->json());
            }

            return response()->json([
                'success' => false,
                'error' => 'Failed to delete stack: ' . $response->body()
            ], 500);
        } catch (\Exception $e) {
            \Log::error('Docker Agent error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
