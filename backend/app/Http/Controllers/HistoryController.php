<?php

namespace App\Http\Controllers;

use App\Models\History;
use Illuminate\Http\Request;

class HistoryController extends Controller
{
    public function getHistory(Request $request)
    {
        $page = $request->input('page', 1);

        $perPage = $request->input('per_page', 50);

        $history = History::orderBy('created_at', 'desc')->paginate($perPage, ['*'], 'page', $page);

        return response()->json($history);
    }
}
