<?php

namespace App\Http\Controllers;

use App\Models\Bid;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class BidDataController extends Controller
{
    public function show($id) {
        $bid = Bid::with('institution')->where('id', $id)
            ->where('user_id', auth()->id())
            ->firstOrFail();

        $user = User::where('id', auth()->id())->first();

        if ($bid->files && is_array($bid->files)) {
            $formattedFiles = [];
            foreach ($bid->files as $file) {
                if (is_string($file)) {
                    $formattedFiles[] = [
                        'name' => basename($file),
                        'path' => $file,
                        'url' => Storage::disk('public')->url($file),
                        'size' => Storage::disk('public')->exists($file) ? Storage::disk('public')->size($file) : 0,
                        'mime' => Storage::disk('public')->exists($file) ? Storage::disk('public')->mimeType($file) : 'application/octet-stream',
                    ];
                }
                elseif (is_array($file) && isset($file['path'])) {
                    $formattedFiles[] = [
                        'name' => $file['name'] ?? basename($file['path']),
                        'path' => $file['path'],
                        'url' => Storage::disk('public')->url($file['path']),
                        'size' => $file['size'] ?? (Storage::disk('public')->exists($file['path']) ? Storage::disk('public')->size($file['path']) : 0),
                        'mime' => $file['mime'] ?? (Storage::disk('public')->exists($file['path']) ? Storage::disk('public')->mimeType($file['path']) : 'application/octet-stream'),
                    ];
                }
            }
            $bid->files = $formattedFiles;
        }

        return Inertia::render('ProfilePages/FillBid', [
            'user' => $user,
            'bid' => $bid
        ]);
    }


    public function downloadFile($bidId, $fileIndex)
{
    $bid = Bid::where('id', $bidId)
        ->where('user_id', auth()->id())
        ->firstOrFail();

    $files = $bid->files ?? [];
    
    if (is_string($files)) {
        $files = json_decode($files, true);
    }

    $fileIndex = $fileIndex - 1;
    
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

    public function uploadFiles(Request $request, $id)
    {
        $request->validate([
            'files' => 'required|array',
            'files.*' => 'file|max:30720|mimes:jpg,jpeg,png,gif,pdf,doc,docx'
        ]);

        $bid = Bid::findOrFail($id);

        if ($bid->user_id !== auth()->id()) {
            return response()->json(['error' => 'Доступ запрещен'], 403);
        }

        $uploadedFiles = [];
        $currentFiles = $bid->files ?? [];

        foreach ($request->file('files') as $file) {
            $originalName = $file->getClientOriginalName();
            $filename = Str::slug(pathinfo($originalName, PATHINFO_FILENAME)) . '_' . time() . '_' . Str::random(10) . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('uploads', $filename, 'public');

            $fileInfo = [
                'name' => $originalName,
                'path' => $path,
                'size' => $file->getSize(),
                'mime' => $file->getMimeType(),
                'uploaded_at' => now()->toISOString()
            ];

            $uploadedFiles[] = $fileInfo;
        }

        $bid->files = array_merge($currentFiles, $uploadedFiles);
        $bid->save();

        return redirect()->back()->with('success', 'Файлы успешно загружены');
    }

    public function deleteFile(Request $request, $id)
{
    $bid = Bid::where('id', $id)
        ->where('user_id', auth()->id())
        ->firstOrFail();

    $request->validate([
        'file_path' => 'required|string'
    ]);

    $files = $bid->files ?? [];
    
    if (is_string($files)) {
        $files = json_decode($files, true);
    }
    
    $fileFound = false;
    $newFiles = [];
    $filePathToDelete = $request->file_path;

    foreach ($files as $file) {
        $currentPath = is_string($file) ? $file : ($file['path'] ?? null);
        
        if ($currentPath === $filePathToDelete || basename($currentPath) === basename($filePathToDelete)) {
            if (Storage::disk('public')->exists($currentPath)) {
                Storage::disk('public')->delete($currentPath);
                \Log::info('File deleted from storage: ' . $currentPath);
            } else {
                \Log::warning('File not found in storage: ' . $currentPath);
            }
            $fileFound = true;
        } else {
            $newFiles[] = $file;
        }
    }

    if (!$fileFound) {
        return redirect()->back()->with('error', 'Файл не найден в базе данных');
    }

    $bid->files = $newFiles;
    $bid->save();

    \Log::info('File removed from bid', [
        'bid_id' => $bid->id,
        'file_path' => $filePathToDelete,
        'remaining_files' => count($newFiles)
    ]);

    return redirect()->back()->with('success', 'Файл успешно удален');
}
}