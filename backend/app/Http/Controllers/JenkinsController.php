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
        // Настройки Jenkins (из .env или напрямую)
        $this->jenkinsUrl = env('JENKINS_URL', 'http://localhost:8080');
        $this->jenkinsUser = env('JENKINS_USER', 'pavel');
        $this->jenkinsToken = env('JENKINS_TOKEN', '11a7b30faf5f7411e8ebb977d3f814f18e');
        $this->dockerAgent = new DockerAgentService('http://localhost:3001');
    }

    /**
     * POST /api/jenkins/deploy
     * Запустить сборку в Jenkins
     */
    public function deploy(Request $request)
    {
        try {
            $request->validate([
                'branch' => 'required|string|in:master,develop',
                'stack_type' => 'required|string|in:full,api,mysql',
                'stack_name' => 'required|string|unique:sandboxes,name',
                'machine_ip' => 'sometimes|ip'
            ]);

            $branch = $request->branch;
            $stackType = $request->stack_type;
            $stackName = $request->stack_name;
            $machineIp = $request->machine_ip ?? '127.0.0.1';

            $jobName = 'sandbox-pipeline';

            Log::info('Запуск сборки Jenkins', [
                'job' => $jobName,
                'branch' => $branch,
                'stack_type' => $stackType,
                'stack_name' => $stackName
            ]);

            $params = [
                'branch' => $branch,
                'stack_type' => $stackType,
                'stack_name' => $stackName,
                'machine_ip' => $machineIp,
                'triggered_by' => 'dashboard'
            ];

            $response = Http::withBasicAuth($this->jenkinsUser, $this->jenkinsToken)
                ->asForm()
                ->post("{$this->jenkinsUrl}/job/{$jobName}/buildWithParameters", $params);

            if ($response->successful()) {
                $location = $response->header('Location');
                $buildNumber = null;

                if ($location && preg_match('/\/(\d+)\/$/', $location, $matches)) {
                    $buildNumber = $matches[1];
                }

                // Логируем в историю
                History::log(
                    0, // системное действие
                    'jenkins_build_started',
                    "Запущена сборка #{$buildNumber} для ветки {$branch} (тип: {$stackType})"
                );

                return response()->json([
                    'success' => true,
                    'message' => "Сборка успешно запущена в Jenkins",
                    'build_number' => $buildNumber,
                    'job' => $jobName,
                    'queue_url' => $location
                ]);
            }

            Log::error('Ошибка Jenkins API', [
                'status' => $response->status(),
                'body' => $response->body()
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Ошибка при запуске сборки',
                'details' => $response->body()
            ], 500);

        } catch (\Exception $e) {
            Log::error('Ошибка в JenkinsController@deploy: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * GET /api/jenkins/jobs
     * Получить список задач из Jenkins
     */
    public function getJobs()
    {
        try {
            $response = Http::withBasicAuth($this->jenkinsUser, $this->jenkinsToken)
                ->get("{$this->jenkinsUrl}/api/json?tree=jobs[name,url,color,lastBuild[number,result,timestamp]]");

            if (!$response->successful()) {
                return response()->json([
                    'success' => false,
                    'error' => 'Не удалось получить список задач'
                ], 500);
            }

            $data = $response->json();
            $jobs = $data['jobs'] ?? [];

            // Форматируем для удобства
            $formattedJobs = array_map(function($job) {
                return [
                    'name' => $job['name'],
                    'url' => $job['url'],
                    'status' => $this->jenkinsColorToStatus($job['color']),
                    'last_build' => $job['lastBuild'] ?? null
                ];
            }, $jobs);

            return response()->json([
                'success' => true,
                'jobs' => $formattedJobs
            ]);

        } catch (\Exception $e) {
            Log::error('Ошибка получения задач Jenkins: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * POST /api/jenkins/webhook
     * Принимает уведомления от Jenkins
     */
    public function webhook(Request $request)
    {
        try {
            $payload = $request->all();

            Log::info('Webhook от Jenkins получен', $payload);

            // Проверяем, что это уведомление о сборке
            if (!isset($payload['build'])) {
                return response()->json(['status' => 'ignored'], 200);
            }

            $build = $payload['build'];
            $buildNumber = $build['number'] ?? null;
            $buildStatus = $build['status'] ?? 'UNKNOWN';
            $buildParameters = $build['parameters'] ?? [];

            $branch = $buildParameters['branch'] ?? 'master';
            $stackType = $buildParameters['stack_type'] ?? 'full';
            $machineIp = $buildParameters['machine_ip'] ?? '127.0.0.1';

            // Логируем получение webhook
            History::log(
                0,
                'jenkins_build_' . strtolower($buildStatus),
                "Сборка #{$buildNumber} для ветки {$branch} завершена со статусом {$buildStatus}"
            );

            // Если сборка успешна - создаём стек автоматически
            if ($buildStatus === 'SUCCESS') {
                $stackName = $buildParameters['stack_name'] ?? null;
                $this->createStackFromJenkins($buildNumber, $branch, $stackType, $machineIp, $stackName);
            }

            return response()->json([
                'success' => true,
                'message' => 'Webhook обработан'
            ]);

        } catch (\Exception $e) {
            Log::error('Ошибка обработки webhook: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Создать стек из успешной сборки Jenkins
     */
    private function createStackFromJenkins($buildNumber, $branch, $stackType, $machineIp, $stackName = null)
    {
        try {
            if ($stackName) {
                $finalName = $stackName;
            } else {
                $finalName = "jenkins-{$branch}-{$buildNumber}";
            }

            if (Sandbox::where('name', $finalName)->exists()) {
                Log::info('Стек уже существует', ['name' => $finalName]);
                return;
            }



            // Создаём запись в БД
            $sandbox = Sandbox::create([
                'name' => $finalName,
                'git_branch' => $branch,
                'stack_type' => $stackType,
                'machine_ip' => $machineIp,
                'status' => 'deploying',
                'version' => "build-{$buildNumber}",
                'last_deployed' => now(),
            ]);

            // Запускаем стек через Docker Agent
            $result = $this->dockerAgent->startStack($finalName, $branch, $stackType);

            if ($result['success']) {
                $sandbox->status = 'running';
                $sandbox->save();

                History::log(
                    $sandbox->id,
                    'jenkins_deploy_success',
                    "Стек {$finalName} создан из сборки #{$buildNumber}"
                );

                Log::info('Стек успешно создан из Jenkins', ['name' => $finalName]);
            } else {
                $sandbox->status = 'failed';
                $sandbox->save();

                History::log(
                    $sandbox->id,
                    'jenkins_deploy_failed',
                    "Ошибка создания стека из сборки #{$buildNumber}: " . ($result['error'] ?? 'Неизвестная ошибка')
                );
            }

        } catch (\Exception $e) {
            Log::error('Ошибка создания стека из Jenkins: ' . $e->getMessage());
        }
    }

    /**
     * Преобразовать Jenkins color в статус
     */
    private function jenkinsColorToStatus($color)
    {
        if (strpos($color, 'blue') === 0) return 'success';
        if (strpos($color, 'yellow') === 0) return 'unstable';
        if (strpos($color, 'red') === 0) return 'failed';
        if (strpos($color, 'grey') === 0) return 'disabled';
        if (strpos($color, 'aborted') === 0) return 'aborted';
        return 'unknown';
    }
}
