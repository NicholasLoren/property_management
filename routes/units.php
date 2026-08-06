<?php

use App\Http\Controllers\UnitController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('units', [UnitController::class, 'allIndex'])->middleware('can:units.view')->name('units.all');
});

Route::middleware(['auth', 'verified'])->scopeBindings()->group(function () {
    Route::get('properties/{property}/units', [UnitController::class, 'index'])->middleware('can:units.view')->name('units.index');
    Route::get('properties/{property}/units/create', [UnitController::class, 'create'])->middleware('can:units.add')->name('units.create');
    Route::post('properties/{property}/units', [UnitController::class, 'store'])->middleware('can:units.add')->name('units.store');
    Route::get('properties/{property}/units/{unit}/edit', [UnitController::class, 'edit'])->middleware('can:units.edit')->name('units.edit');
    Route::get('properties/{property}/units/{unit}', [UnitController::class, 'show'])->middleware('can:units.view')->name('units.show');
    Route::put('properties/{property}/units/{unit}', [UnitController::class, 'update'])->middleware('can:units.edit')->name('units.update');
    Route::delete('properties/{property}/units/{unit}', [UnitController::class, 'destroy'])->middleware('can:units.delete')->name('units.destroy');

    Route::patch('properties/{property}/units/{unit}/restore', [UnitController::class, 'restore'])
        ->middleware('can:units.delete')
        ->withTrashed()
        ->name('units.restore');

    Route::delete('properties/{property}/units/{unit}/force', [UnitController::class, 'forceDelete'])
        ->middleware('can:units.delete')
        ->withTrashed()
        ->name('units.force-delete');
});
