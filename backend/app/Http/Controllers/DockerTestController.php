<?php

namespace App\Http\Controllers;

use App\Services\DockerAgentService;
use Illuminate\Http\Request;

class DockerTestController extends Controller
{
    public function test() {

        $agent = new DockerAgentService('http://localhost:3001');

        $ping = $agent->ping();

        $containers = $agent->getContainers();

        return response()->json([
            'ping' => $ping,
            'containers' => $containers,
            'containers_count' => count($containers),
            ]);
    }

    public function restart($id) {
        $agent = new DockerAgentService('http://localhost:3001');
        $result = $agent->restartContainer($id);

        return response()->json([
            'message' => 'Контейнер перезапущен',
            'result' => $result,
        ]);
    }
}
