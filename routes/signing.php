<?php

use App\Http\Controllers\SigningController;
use Illuminate\Support\Facades\Route;

// Deliberately outside the 'auth' middleware group — reached via a
// single-use emailed/texted link, not a login (see LeaseSigningLink).
Route::get('sign/{token}', [SigningController::class, 'show'])->name('signing.show');
Route::post('sign/{token}', [SigningController::class, 'store'])->name('signing.store');
