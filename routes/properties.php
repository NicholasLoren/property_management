<?php

use App\Http\Controllers\PropertyController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('properties', [PropertyController::class, 'index'])->middleware('can:properties.view')->name('properties.index');
    Route::get('properties/export/{format}', [PropertyController::class, 'export'])
        ->middleware('can:properties.view')
        ->whereIn('format', ['pdf', 'excel'])
        ->name('properties.export');
    Route::get('properties/create', [PropertyController::class, 'create'])->middleware('can:properties.add')->name('properties.create');
    Route::post('properties', [PropertyController::class, 'store'])->middleware('can:properties.add')->name('properties.store');
    Route::get('properties/{property}/edit', [PropertyController::class, 'edit'])->middleware('can:properties.edit')->name('properties.edit');
    Route::put('properties/{property}', [PropertyController::class, 'update'])->middleware('can:properties.edit')->name('properties.update');
    Route::get('properties/{property}', [PropertyController::class, 'show'])->middleware('can:properties.view')->name('properties.show');
    Route::delete('properties/{property}', [PropertyController::class, 'destroy'])->middleware('can:properties.delete')->name('properties.destroy');

    Route::patch('properties/{property}/restore', [PropertyController::class, 'restore'])
        ->middleware('can:properties.delete')
        ->withTrashed()
        ->name('properties.restore');

    Route::delete('properties/{property}/force', [PropertyController::class, 'forceDelete'])
        ->middleware('can:properties.delete')
        ->withTrashed()
        ->name('properties.force-delete');
});
