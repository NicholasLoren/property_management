<?php

use App\Http\Controllers\TenantController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('tenants', [TenantController::class, 'index'])->middleware('can:tenants.view')->name('tenants.index');
    Route::get('tenants/create', [TenantController::class, 'create'])->middleware('can:tenants.add')->name('tenants.create');
    Route::post('tenants', [TenantController::class, 'store'])->middleware('can:tenants.add')->name('tenants.store');
    Route::get('tenants/{tenant}/edit', [TenantController::class, 'edit'])->middleware('can:tenants.edit')->name('tenants.edit');
    Route::put('tenants/{tenant}', [TenantController::class, 'update'])->middleware('can:tenants.edit')->name('tenants.update');
    Route::get('tenants/{tenant}', [TenantController::class, 'show'])->middleware('can:tenants.view')->name('tenants.show');
    Route::delete('tenants/{tenant}', [TenantController::class, 'destroy'])->middleware('can:tenants.delete')->name('tenants.destroy');

    Route::patch('tenants/{tenant}/restore', [TenantController::class, 'restore'])
        ->middleware('can:tenants.delete')
        ->withTrashed()
        ->name('tenants.restore');

    Route::delete('tenants/{tenant}/force', [TenantController::class, 'forceDelete'])
        ->middleware('can:tenants.delete')
        ->withTrashed()
        ->name('tenants.force-delete');
});
