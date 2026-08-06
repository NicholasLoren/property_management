<?php

use App\Http\Controllers\ExpenseController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('expenses', [ExpenseController::class, 'index'])->middleware('can:expenses.view')->name('expenses.index');
    Route::get('expenses/create', [ExpenseController::class, 'create'])->middleware('can:expenses.add')->name('expenses.create');
    Route::post('expenses', [ExpenseController::class, 'store'])->middleware('can:expenses.add')->name('expenses.store');
    Route::get('expenses/{expense}/edit', [ExpenseController::class, 'edit'])->middleware('can:expenses.edit')->name('expenses.edit');
    Route::put('expenses/{expense}', [ExpenseController::class, 'update'])->middleware('can:expenses.edit')->name('expenses.update');
    Route::delete('expenses/{expense}', [ExpenseController::class, 'destroy'])->middleware('can:expenses.delete')->name('expenses.destroy');

    Route::patch('expenses/{expense}/restore', [ExpenseController::class, 'restore'])
        ->middleware('can:expenses.delete')
        ->withTrashed()
        ->name('expenses.restore');

    Route::delete('expenses/{expense}/force', [ExpenseController::class, 'forceDelete'])
        ->middleware('can:expenses.delete')
        ->withTrashed()
        ->name('expenses.force-delete');
});
