<?php

use App\Http\Controllers\MessageController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('messages', [MessageController::class, 'index'])->middleware('can:messages.view')->name('messages.index');
    Route::get('messages/create', [MessageController::class, 'create'])->middleware('can:messages.send')->name('messages.create');
    Route::post('messages', [MessageController::class, 'store'])->middleware('can:messages.send')->name('messages.store');
    Route::get('messages/{message}', [MessageController::class, 'show'])->middleware('can:messages.view')->name('messages.show');
    Route::get('messages/{message}/details', [MessageController::class, 'details'])->middleware('can:messages.view')->name('messages.details');
});
