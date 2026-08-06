<?php

use App\Http\Controllers\LeaseController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('leases', [LeaseController::class, 'index'])->middleware('can:leases.view')->name('leases.index');
    Route::get('leases/create', [LeaseController::class, 'create'])->middleware('can:leases.add')->name('leases.create');
    Route::post('leases', [LeaseController::class, 'store'])->middleware('can:leases.add')->name('leases.store');
    Route::get('leases/{lease}/edit', [LeaseController::class, 'edit'])->middleware('can:leases.edit')->name('leases.edit');
    Route::put('leases/{lease}', [LeaseController::class, 'update'])->middleware('can:leases.edit')->name('leases.update');
    Route::get('leases/{lease}', [LeaseController::class, 'show'])->middleware('can:leases.view')->name('leases.show');
    Route::delete('leases/{lease}', [LeaseController::class, 'destroy'])->middleware('can:leases.delete')->name('leases.destroy');

    Route::patch('leases/{lease}/restore', [LeaseController::class, 'restore'])
        ->middleware('can:leases.delete')
        ->withTrashed()
        ->name('leases.restore');

    Route::delete('leases/{lease}/force', [LeaseController::class, 'forceDelete'])
        ->middleware('can:leases.delete')
        ->withTrashed()
        ->name('leases.force-delete');
});
