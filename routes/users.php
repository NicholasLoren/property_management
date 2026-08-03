<?php

use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('users', [UserController::class, 'index'])->middleware('can:users.view')->name('users.index');
    Route::get('users/export/{format}', [UserController::class, 'export'])
        ->middleware('can:users.view')
        ->whereIn('format', ['pdf', 'excel'])
        ->name('users.export');
    Route::get('users/create', [UserController::class, 'create'])->middleware('can:users.add')->name('users.create');
    Route::post('users', [UserController::class, 'store'])->middleware('can:users.add')->name('users.store');
    Route::get('users/{user}/edit', [UserController::class, 'edit'])->middleware('can:users.edit')->name('users.edit');
    Route::patch('users/{user}', [UserController::class, 'update'])->middleware('can:users.edit')->name('users.update');
    Route::get('users/{user}', [UserController::class, 'show'])->middleware('can:users.view')->name('users.show');
    Route::delete('users/{user}', [UserController::class, 'destroy'])->middleware('can:users.delete')->name('users.destroy');

    Route::patch('users/{user}/restore', [UserController::class, 'restore'])
        ->middleware('can:users.delete')
        ->withTrashed()
        ->name('users.restore');

    Route::delete('users/{user}/force', [UserController::class, 'forceDelete'])
        ->middleware('can:users.delete')
        ->withTrashed()
        ->name('users.force-delete');
});
