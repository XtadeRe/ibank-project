<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Bid;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Institution;
use Illuminate\Support\Facades\Storage;

class ManagerController extends Controller
{
    public function index() {
        $bids = Bid::orderBy('created_at', 'desc')->get();

        return Inertia::render('Manager/Index', [
            'bids' => $bids
        ]);
    }

    public function profile() {
        $user = User::where('id', auth()->id())->first();
        $bids = Bid::orderBy('created_at', 'desc')->get();

        return Inertia::render('Profile', [
            'user' => $user,
            'bids' => $bids
        ]);
    }

    public function update(Request $request, $id) {
        $bid = Bid::where('id', $id)->first();
        $bid->update([
            'status' => $request->status
        ]);
    }

    public function updateInstitutionStatus(Request $request, $id) {

        $bid = Bid::where('id', $id)->first();
        $bid->update([
            'institution_status' => $request->status
        ]);
    }
    
    
    public function delete(Request $request, $id) {
        $bid = Bid::where('id', $id)->first();
        $bid->delete();
    }

    public function show(Request $request, $id) {
        $bid = Bid::with('institution')->findOrFail($id);
        return Inertia::render('Manager/BidDetails', [
            'bid' => $bid,
            'institution' => $bid->institution 
        ]);
    }

    public function downloadFile($bidId, $fileIndex)
    {
        $bid = Bid::findOrFail($bidId);

        $files = $bid->files ?? [];
        
        if (is_string($files)) {
            $files = json_decode($files, true);
        }
        
        if (!isset($files[$fileIndex])) {
            abort(404, 'Файл не найден');
        }

        $file = $files[$fileIndex];
        
        $filePath = is_string($file) ? $file : ($file['path'] ?? null);
        
        if (!$filePath) {
            abort(404, 'Путь к файлу не найден');
        }
        
        $originalName = is_array($file) && isset($file['name']) 
            ? $file['name'] 
            : basename($filePath);
        
        if (!Storage::disk('public')->exists($filePath)) {
            abort(404, 'Файл не найден на диске');
        }
        
        return response()->download(
            Storage::disk('public')->path($filePath), 
            $originalName,
            ['Content-Type' => Storage::disk('public')->mimeType($filePath)]
        );
    }

    public function sentInstruction($bidId) {
        $bid = Bid::where('id', $bidId)->first();

        $bid->update([
            'instruction' => true
        ]);
    }
}