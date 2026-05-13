<?php

use App\Http\Controllers\Auth\GoogleAuthController;
use App\Http\Controllers\BidController;
use App\Http\Controllers\BidDataController;
use App\Http\Controllers\InstitutionController;
use App\Http\Controllers\ManagerController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\AuthController;


Route::get('/register', fn () => inertia('Register'))->name('register');
Route::get('/login', fn () => inertia('Login'))->name('login');
Route::get('/auth/google', [GoogleAuthController::class, 'redirectToGoogle'])
    ->name('login.google');

Route::get('/auth/google/callback', [GoogleAuthController::class, 'handleGoogleCallback'])
    ->name('login.google.callback');

Route::get('/catalog', [InstitutionController::class, 'index'])->name('catalog');
Route::get('/catalog/{id}', [InstitutionController::class, 'show'])->name('institutionPage')->middleware('track.views');;
Route::get('/immigration', [InstitutionController::class, 'showFromRules'])->name('immigration');
Route::get('/', [InstitutionController::class, 'main'])->name('home');

Route::post('/register', [AuthController::class, 'store'])->name('register.store');
Route::post('/login', [AuthController::class, 'login'])->name('login.store');
Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

Route::post('/catalog/{id}/bids', [BidController::class, 'store'])->name('bid.store');

Route::get('/profile', [UserController::class, 'index'])->name('profile.index');
Route::get('/profile/bids', [UserController::class, 'bids'])->name('profile.bids');
Route::put('/profile/bids/{id}', [UserController::class, 'updateBidStatus'])->name('bid.update');
Route::patch('/profile/phone', [UserController::class, 'updatePhone'])->name('profile.phone');
Route::get('/profile/bids/fillBid/{id}', [BidDataController::class, 'show'])->name('bid.fill');


Route::get('/bids/{bidId}/download/{fileIndex}', [BidDataController::class, 'downloadFile'])->name('bid.download');
Route::post('/bids/{bid}/upload-files', [BidDataController::class, 'uploadFiles'])->name('bids.upload-files');
Route::delete('/bids/{id}/delete-file', [BidDataController::class, 'deleteFile'])->name('bids.destroy');


Route::get('/profile/manager_menu', [ManagerController::class, 'index'])->name('manager.menu');
Route::get('/profile/manager', [ManagerController::class, 'profile'])->name('manager.profile');
Route::delete('/profile/manager_menu/{id}/delete', [ManagerController::class, 'delete'])->name('manager.bid.delete');
Route::patch('/profile/manager_menu/{id}/status', [ManagerController::class, 'update'])->name('manager.bid.update');
Route::patch('/profile/manager_menu/{id}/institution/status', [ManagerController::class, 'updateInstitutionStatus'])->name('manager.bid.institution.update');
Route::get('/profile/manager_menu/{id}/details', [ManagerController::class, 'show'])->name('manager.bid.show');
Route::get('/profile/manager_menu/{id}/download/{fileIndex}', [ManagerController::class, 'downloadFile'])->name('manager.file.download');
Route::get('/profile/manager_menu/{id}/instruction', [ManagerController::class, 'sentInstruction'])->name('manager.instruction.sent');
