<?php

namespace App\Http\Controllers;

use App\Models\History;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class HistoryController extends Controller
{
    public function getHistory(Request $request)
    {
        $page = $request->input('page', 1);

        $perPage = $request->input('per_page', 5);

$history = Cache::remember("history_page_{$page}_{$perPage}", 120, function() use ($page, $perPage) {
    return History::select(['id', 'sandbox_id', 'action', 'message', 'created_at'])
        ->orderBy('created_at', 'desc')
        ->paginate($perPage, ['*'], 'page', $page);
});

        return response()->json($history);
    }
}
