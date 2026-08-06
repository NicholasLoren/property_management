<?php

use App\Http\Controllers\LandlordController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('landlords', [LandlordController::class, 'index'])->middleware('can:landlords.view')->name('landlords.index');
    Route::get('landlords/{landlord}', [LandlordController::class, 'show'])->middleware('can:landlords.view')->name('landlords.show');
});
