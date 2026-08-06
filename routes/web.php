<?php

use App\Http\Controllers\PwaManifestController;
use Illuminate\Support\Facades\Route;

// Named "home" (rather than removed outright) since Fortify's logout and
// account-deletion responses redirect here by default.
Route::redirect('/', '/dashboard')->name('home');

Route::get('manifest.webmanifest', [PwaManifestController::class, 'show'])->name('pwa.manifest');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
});

require __DIR__.'/settings.php';
require __DIR__.'/users.php';
require __DIR__.'/roles.php';
require __DIR__.'/company-settings.php';
require __DIR__.'/logs.php';
require __DIR__.'/messages.php';
require __DIR__.'/properties.php';
require __DIR__.'/units.php';
require __DIR__.'/tenants.php';
require __DIR__.'/leases.php';
require __DIR__.'/landlords.php';
require __DIR__.'/geocoding.php';
