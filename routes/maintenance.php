<?php

use App\Http\Controllers\MaintenanceController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('maintenance', [MaintenanceController::class, 'index'])->middleware('can:maintenance.view')->name('maintenance.index');
    Route::get('maintenance/create', [MaintenanceController::class, 'create'])->middleware('can:maintenance.add')->name('maintenance.create');
    Route::post('maintenance', [MaintenanceController::class, 'store'])->middleware('can:maintenance.add')->name('maintenance.store');
    Route::get('maintenance/{maintenance}/edit', [MaintenanceController::class, 'edit'])->middleware('can:maintenance.edit')->name('maintenance.edit');
    Route::put('maintenance/{maintenance}', [MaintenanceController::class, 'update'])->middleware('can:maintenance.edit')->name('maintenance.update');
    Route::get('maintenance/{maintenance}', [MaintenanceController::class, 'show'])->middleware('can:maintenance.view')->name('maintenance.show');
    Route::delete('maintenance/{maintenance}', [MaintenanceController::class, 'destroy'])->middleware('can:maintenance.delete')->name('maintenance.destroy');

    Route::patch('maintenance/{maintenance}/restore', [MaintenanceController::class, 'restore'])
        ->middleware('can:maintenance.delete')
        ->withTrashed()
        ->name('maintenance.restore');

    Route::delete('maintenance/{maintenance}/force', [MaintenanceController::class, 'forceDelete'])
        ->middleware('can:maintenance.delete')
        ->withTrashed()
        ->name('maintenance.force-delete');
});
