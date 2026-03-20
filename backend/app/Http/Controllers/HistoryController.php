<?php

namespace App\Http\Controllers;

use App\Models\History;
use Illuminate\Http\Request;

class HistoryController extends Controller
{
    public function getHistory() {

        $history = History::all();

        return response()->json($history);
    }
}
