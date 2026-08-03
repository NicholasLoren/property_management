<?php

use App\Http\Controllers\LogController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', 'can:logs.view'])->group(function () {
    Route::get('logs', [LogController::class, 'index'])->name('logs.index');
});
