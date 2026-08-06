<?php

use App\Http\Controllers\AmenityController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ExtrasController;
use App\Http\Controllers\UnitTypeController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::redirect('extras', '/extras/expense-categories');

    foreach (['expense', 'income', 'document'] as $type) {
        $section = "{$type}-categories";

        Route::get("extras/{$section}/create", [CategoryController::class, 'create'])
            ->defaults('type', $type)->middleware('can:extras.add')->name("extras.{$section}.create");
        Route::post("extras/{$section}", [CategoryController::class, 'store'])
            ->defaults('type', $type)->middleware('can:extras.add')->name("extras.{$section}.store");
        Route::get("extras/{$section}/{category}/edit", [CategoryController::class, 'edit'])
            ->defaults('type', $type)->middleware('can:extras.edit')->name("extras.{$section}.edit");
        Route::put("extras/{$section}/{category}", [CategoryController::class, 'update'])
            ->defaults('type', $type)->middleware('can:extras.edit')->name("extras.{$section}.update");
        Route::delete("extras/{$section}/{category}", [CategoryController::class, 'destroy'])
            ->defaults('type', $type)->middleware('can:extras.delete')->name("extras.{$section}.destroy");
        Route::patch("extras/{$section}/{category}/restore", [CategoryController::class, 'restore'])
            ->defaults('type', $type)->middleware('can:extras.delete')->withTrashed()->name("extras.{$section}.restore");
        Route::delete("extras/{$section}/{category}/force", [CategoryController::class, 'forceDelete'])
            ->defaults('type', $type)->middleware('can:extras.delete')->withTrashed()->name("extras.{$section}.force-delete");
    }

    Route::get('extras/property-features/create', [AmenityController::class, 'create'])->middleware('can:extras.add')->name('extras.property-features.create');
    Route::post('extras/property-features', [AmenityController::class, 'store'])->middleware('can:extras.add')->name('extras.property-features.store');
    Route::get('extras/property-features/{amenity}/edit', [AmenityController::class, 'edit'])->middleware('can:extras.edit')->name('extras.property-features.edit');
    Route::put('extras/property-features/{amenity}', [AmenityController::class, 'update'])->middleware('can:extras.edit')->name('extras.property-features.update');
    Route::delete('extras/property-features/{amenity}', [AmenityController::class, 'destroy'])->middleware('can:extras.delete')->name('extras.property-features.destroy');
    Route::patch('extras/property-features/{amenity}/restore', [AmenityController::class, 'restore'])->middleware('can:extras.delete')->withTrashed()->name('extras.property-features.restore');
    Route::delete('extras/property-features/{amenity}/force', [AmenityController::class, 'forceDelete'])->middleware('can:extras.delete')->withTrashed()->name('extras.property-features.force-delete');

    Route::get('extras/unit-types/create', [UnitTypeController::class, 'create'])->middleware('can:extras.add')->name('extras.unit-types.create');
    Route::post('extras/unit-types', [UnitTypeController::class, 'store'])->middleware('can:extras.add')->name('extras.unit-types.store');
    Route::get('extras/unit-types/{unitType}/edit', [UnitTypeController::class, 'edit'])->middleware('can:extras.edit')->name('extras.unit-types.edit');
    Route::put('extras/unit-types/{unitType}', [UnitTypeController::class, 'update'])->middleware('can:extras.edit')->name('extras.unit-types.update');
    Route::delete('extras/unit-types/{unitType}', [UnitTypeController::class, 'destroy'])->middleware('can:extras.delete')->name('extras.unit-types.destroy');
    Route::patch('extras/unit-types/{unitType}/restore', [UnitTypeController::class, 'restore'])->middleware('can:extras.delete')->withTrashed()->name('extras.unit-types.restore');
    Route::delete('extras/unit-types/{unitType}/force', [UnitTypeController::class, 'forceDelete'])->middleware('can:extras.delete')->withTrashed()->name('extras.unit-types.force-delete');

    Route::get('extras/{section}', [ExtrasController::class, 'index'])
        ->whereIn('section', ['expense-categories', 'income-categories', 'document-categories', 'property-features', 'unit-types'])
        ->middleware('can:extras.view')
        ->name('extras.index');
});
