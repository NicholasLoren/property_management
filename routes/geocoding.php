<?php

use App\Http\Controllers\GeocodingController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('geocode/search', [GeocodingController::class, 'search'])->name('geocode.search');
    Route::get('geocode/reverse', [GeocodingController::class, 'reverse'])->name('geocode.reverse');
});
