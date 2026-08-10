<?php

use App\Http\Controllers\FinancialsController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('financials', [FinancialsController::class, 'index'])->middleware('can:reports.view')->name('financials.index');
    Route::get('financials/export/{format}', [FinancialsController::class, 'export'])
        ->middleware('can:reports.view')
        ->whereIn('format', ['pdf', 'excel'])
        ->name('financials.export');
});
