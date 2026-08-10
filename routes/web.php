<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\PwaManifestController;
use Illuminate\Support\Facades\Route;

// Named "home" (rather than removed outright) since Fortify's logout and
// account-deletion responses redirect here by default.
Route::redirect('/', '/dashboard')->name('home');

Route::get('manifest.webmanifest', [PwaManifestController::class, 'show'])->name('pwa.manifest');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'show'])->name('dashboard');
});

require __DIR__.'/settings.php';
require __DIR__.'/users.php';
require __DIR__.'/roles.php';
require __DIR__.'/company-settings.php';
require __DIR__.'/logs.php';
require __DIR__.'/messages.php';
require __DIR__.'/notifications.php';
require __DIR__.'/properties.php';
require __DIR__.'/units.php';
require __DIR__.'/tenants.php';
require __DIR__.'/leases.php';
require __DIR__.'/landlords.php';
require __DIR__.'/maintenance.php';
require __DIR__.'/payments.php';
require __DIR__.'/expenses.php';
require __DIR__.'/incomes.php';
require __DIR__.'/documents.php';
require __DIR__.'/financials.php';
require __DIR__.'/reports.php';
require __DIR__.'/extras.php';
require __DIR__.'/geocoding.php';
require __DIR__.'/search.php';
