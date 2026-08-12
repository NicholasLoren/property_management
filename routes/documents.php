<?php

use App\Http\Controllers\DocumentController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('documents', [DocumentController::class, 'index'])->middleware('can:documents.view')->name('documents.index');
    Route::get('documents/create', [DocumentController::class, 'create'])->middleware('can:documents.add')->name('documents.create');
    Route::post('documents', [DocumentController::class, 'store'])->middleware('can:documents.add')->name('documents.store');
    Route::get('documents/{document}/edit', [DocumentController::class, 'edit'])->middleware('can:documents.edit')->name('documents.edit');
    Route::put('documents/{document}', [DocumentController::class, 'update'])->middleware('can:documents.edit')->name('documents.update');
    Route::get('documents/{document}', [DocumentController::class, 'show'])->middleware('can:documents.view')->name('documents.show');
    Route::delete('documents/{document}', [DocumentController::class, 'destroy'])->middleware('can:documents.delete')->name('documents.destroy');

    Route::patch('documents/{document}/restore', [DocumentController::class, 'restore'])
        ->middleware('can:documents.delete')
        ->withTrashed()
        ->name('documents.restore');

    Route::delete('documents/{document}/force', [DocumentController::class, 'forceDelete'])
        ->middleware('can:documents.delete')
        ->withTrashed()
        ->name('documents.force-delete');
});
