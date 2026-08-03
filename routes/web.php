<?php

use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
});

require __DIR__.'/settings.php';
require __DIR__.'/users.php';
require __DIR__.'/roles.php';
require __DIR__.'/company-settings.php';
require __DIR__.'/logs.php';
require __DIR__.'/messages.php';
