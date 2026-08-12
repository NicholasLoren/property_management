<?php

use App\Http\Controllers\IncomeController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('incomes', [IncomeController::class, 'index'])->middleware('can:incomes.view')->name('incomes.index');
    Route::get('incomes/create', [IncomeController::class, 'create'])->middleware('can:incomes.add')->name('incomes.create');
    Route::get('incomes/{income}', [IncomeController::class, 'show'])->middleware('can:incomes.view')->name('incomes.show');
    Route::get('incomes/{income}/preview', [IncomeController::class, 'preview'])->middleware('can:incomes.view')->name('incomes.preview');
    Route::post('incomes', [IncomeController::class, 'store'])->middleware('can:incomes.add')->name('incomes.store');
    Route::get('incomes/{income}/edit', [IncomeController::class, 'edit'])->middleware('can:incomes.edit')->name('incomes.edit');
    Route::put('incomes/{income}', [IncomeController::class, 'update'])->middleware('can:incomes.edit')->name('incomes.update');
    Route::delete('incomes/{income}', [IncomeController::class, 'destroy'])->middleware('can:incomes.delete')->name('incomes.destroy');

    Route::patch('incomes/{income}/restore', [IncomeController::class, 'restore'])
        ->middleware('can:incomes.delete')
        ->withTrashed()
        ->name('incomes.restore');

    Route::delete('incomes/{income}/force', [IncomeController::class, 'forceDelete'])
        ->middleware('can:incomes.delete')
        ->withTrashed()
        ->name('incomes.force-delete');
});
