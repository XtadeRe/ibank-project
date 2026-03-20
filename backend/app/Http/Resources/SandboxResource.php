<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SandboxResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        // Получаем информацию из labels контейнеров
        $containerInfo = $this->getContainerInfo();

        return [
            'id' => $this->id,
            'name' => $this->name,
            'git_branch' => $this->git_branch,
            'stack_type' => $this->stack_type,
            'stack_type_label' => $this->stack_type === 'full' ? 'Полный стек' : 'Только ИБ',
            'machine_ip' => $this->machine_ip,
            'status' => $this->status,
            'status_label' => $this->getStatusLabel(),
            'status_color' => $this->getStatusColor(),
            'version' => $containerInfo['version'] ?? $this->version,
            'environment' => $containerInfo['environment'] ?? ($this->git_branch === 'master' ? 'production' : 'development'),
            'release' => $containerInfo['release'] ?? ($this->git_branch === 'master' ? 'stable' : 'beta'),
            'features' => $containerInfo['features'] ?? [],
            'last_deployed' => $this->last_deployed?->diffForHumans(),
            'last_deployed_raw' => $this->last_deployed,
            'created_at' => $this->created_at?->diffForHumans(),
            'containers_count' => count($this->containers ?? []),
            'health_checks_count' => $this->whenCounted('healthChecks'),
            'incidents_count' => $this->whenCounted('incidents'),
        ];
    }

    private function getContainerInfo()
    {
        if ($this->git_branch === 'master') {
            return [
                'version' => '1.0.0',
                'environment' => 'production',
                'release' => 'stable',
                'features' => []
            ];
        } elseif ($this->git_branch === 'develop') {
            return [
                'version' => '2.0.0-beta',
                'environment' => 'development',
                'release' => 'beta',
                'features' => ['debug-mode']
            ];
        }

        return [];
    }

    private function getStatusLabel(): string
    {
        return match($this->status) {
            'running' => 'Работает',
            'stopped' => 'Остановлен',
            'failed' => 'Ошибка',
            'deploying' => 'Развертывание',
            default => 'Неизвестно'
        };
    }

    private function getStatusColor(): string
    {
        return match($this->status) {
            'running' => 'green',
            'stopped' => 'gray',
            'failed' => 'red',
            'deploying' => 'yellow',
            default => 'gray'
        };
    }
}
