<?php

namespace App\Http\Controllers;

use App\Models\History;
use App\Models\Sandbox;
use App\Services\DockerAgentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class JenkinsController extends Controller
{
    private $jenkinsUrl;
    private $jenkinsUser;
    private $jenkinsToken;
    private $dockerAgent;

    public function __construct()
    {
        $this->jenkinsUrl = env('JENKINS_URL', 'http://host.docker.internal:8080');
        $this->jenkinsUser = env('JENKINS_USER', 'pavel');
        $this->jenkinsToken = env('JENKINS_TOKEN', '11b24dc54a984694db4e419a36bbbe605c');
        $this->dockerAgent = new DockerAgentService(env('DOCKER_AGENT_URL', 'http://host.docker.internal:3001'));
    }

    /**
     * POST /api/jenkins/deploy
     */
    public function deploy(Request $request)
    {
        try {
            $request->validate([
                'branch' => 'required|string',
                'stack_type' => 'required|string|in:full,api',
                'stack_name' => 'required|string|unique:sandboxes,name',
                'machine_ip' => 'sometimes|ip'
            ]);

            $branch = $request->branch;
            $stackType = $request->stack_type;
            $stackName = $request->stack_name;

            Log::info('Запуск создания стека через Jenkins', [
                'branch' => $branch,
                'stack_type' => $stackType,
                'stack_name' => $stackName
            ]);

            // Создаем запись в БД
            $sandbox = Sandbox::create([
                'name' => $stackName,
                'git_branch' => $branch,
                'stack_type' => $stackType,
                'machine_ip' => $request->machine_ip ?? '127.0.0.1',
                'status' => 'deploying',
                'version' => 'pending',
                'last_deployed' => now(),
            ]);

            // Запускаем стек через Docker Agent
            $result = $this->dockerAgent->startStack($stackName, $branch, $stackType);

            if ($result['success']) {
                $sandbox->status = 'running';
                $sandbox->version = '1.0.0';
                $sandbox->save();

                History::log(
                    $sandbox->id,
                    'stack_created',
                    "Стек {$stackName} создан из ветки {$branch} (тип: {$stackType})"
                );

                return response()->json([
                    'success' => true,
                    'message' => 'Стек успешно создан',
                    'stack' => $sandbox,
                    'ports' => $result['ports'] ?? null,
                    'urls' => $result['urls'] ?? null
                ]);
            } else {
                $sandbox->status = 'failed';
                $sandbox->save();

                History::log(
                    $sandbox->id,
                    'stack_failed',
                    "Ошибка создания стека {$stackName}: " . ($result['error'] ?? 'Неизвестная ошибка')
                );

                return response()->json([
                    'success' => false,
                    'error' => $result['error'] ?? 'Ошибка создания стека'
                ], 500);
            }

        } catch (\Exception $e) {
            Log::error('Ошибка в JenkinsController@deploy: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getJobs()
    {
        try {
            $auth = base64_encode("{$this->jenkinsUser}:{$this->jenkinsToken}");

            $response = Http::timeout(10)
                ->withHeaders([
                    'Authorization' => "Basic {$auth}",
                ])
                ->get("{$this->jenkinsUrl}/api/json");

            if ($response->successful()) {
                $data = $response->json();
                $jobs = array_map(function($job) {
                    return [
                        'name' => $job['name'],
                        'url' => $job['url'],
                        'color' => $job['color'] ?? 'grey'
                    ];
                }, $data['jobs'] ?? []);

                return response()->json([
                    'success' => true,
                    'jobs' => $jobs
                ]);
            }

            return response()->json([
                'success' => false,
                'error' => 'Failed to fetch jobs',
                'jobs' => []
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching Jenkins jobs: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
                'jobs' => []
            ], 500);
        }
    }

    /**
     * GET /api/git-branches
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
            return response()->json([
                'success' => false,
                'branches' => ['master', 'develop'],
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * POST /api/jenkins/webhook
     */
    public function webhook(Request $request)
    {
        // Ваш существующий код webhook
        Log::info('Webhook получен', $request->all());
        return response()->json(['success' => true]);
    }
}
