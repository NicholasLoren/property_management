<?php

use App\Http\Controllers\RoleController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('roles', [RoleController::class, 'index'])->middleware('can:roles.view')->name('roles.index');
    Route::get('roles/export/{format}', [RoleController::class, 'export'])
        ->middleware('can:roles.view')
        ->whereIn('format', ['pdf', 'excel'])
        ->name('roles.export');
    Route::get('roles/create', [RoleController::class, 'create'])->middleware('can:roles.add')->name('roles.create');
    Route::post('roles', [RoleController::class, 'store'])->middleware('can:roles.add')->name('roles.store');
    Route::get('roles/{role}/edit', [RoleController::class, 'edit'])->middleware('can:roles.edit')->name('roles.edit');
    Route::patch('roles/{role}', [RoleController::class, 'update'])->middleware('can:roles.edit')->name('roles.update');
    Route::delete('roles/{role}', [RoleController::class, 'destroy'])->middleware('can:roles.delete')->name('roles.destroy');

    Route::patch('roles/{role}/restore', [RoleController::class, 'restore'])
        ->middleware('can:roles.delete')
        ->withTrashed()
        ->name('roles.restore');

    Route::delete('roles/{role}/force', [RoleController::class, 'forceDelete'])
        ->middleware('can:roles.delete')
        ->withTrashed()
        ->name('roles.force-delete');
});
