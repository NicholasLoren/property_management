<?php

use App\Http\Controllers\ReportController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('reports', [ReportController::class, 'index'])->middleware('can:reports.view')->name('reports.index');
    Route::get('reports/export/{format}', [ReportController::class, 'export'])
        ->middleware('can:reports.view')
        ->whereIn('format', ['pdf', 'excel'])
        ->name('reports.export');
});
