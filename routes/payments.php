<?php

use App\Http\Controllers\PaymentController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('payments', [PaymentController::class, 'index'])->middleware('can:payments.view')->name('payments.index');
    Route::get('payments/create', [PaymentController::class, 'create'])->middleware('can:payments.add')->name('payments.create');
    Route::post('payments', [PaymentController::class, 'store'])->middleware('can:payments.add')->name('payments.store');
    Route::get('payments/{payment}/edit', [PaymentController::class, 'edit'])->middleware('can:payments.edit')->name('payments.edit');
    Route::put('payments/{payment}', [PaymentController::class, 'update'])->middleware('can:payments.edit')->name('payments.update');
    Route::delete('payments/{payment}', [PaymentController::class, 'destroy'])->middleware('can:payments.delete')->name('payments.destroy');

    Route::patch('payments/{payment}/restore', [PaymentController::class, 'restore'])
        ->middleware('can:payments.delete')
        ->withTrashed()
        ->name('payments.restore');

    Route::delete('payments/{payment}/force', [PaymentController::class, 'forceDelete'])
        ->middleware('can:payments.delete')
        ->withTrashed()
        ->name('payments.force-delete');
});
