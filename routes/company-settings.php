<?php

use App\Http\Controllers\SettingsController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', 'can:settings.edit'])->group(function () {
    Route::redirect('company-settings', '/company-settings/general');
    Route::get('company-settings/{section}', [SettingsController::class, 'edit'])
        ->whereIn('section', ['general', 'branding', 'sms', 'notifications', 'billing', 'codes', 'trash'])
        ->name('company-settings.edit');
    Route::patch('company-settings/general', [SettingsController::class, 'updateGeneral'])->name('company-settings.update-general');
    Route::patch('company-settings/branding', [SettingsController::class, 'updateBranding'])->name('company-settings.update-branding');
    Route::patch('company-settings/sms', [SettingsController::class, 'updateSms'])->name('company-settings.update-sms');
    Route::patch('company-settings/notifications', [SettingsController::class, 'updateNotifications'])->name('company-settings.update-notifications');
    Route::patch('company-settings/billing', [SettingsController::class, 'updateBilling'])->name('company-settings.update-billing');
    Route::patch('company-settings/codes', [SettingsController::class, 'updateCodes'])->name('company-settings.update-codes');
    Route::post('company-settings/sms/test', [SettingsController::class, 'testSms'])->name('company-settings.test-sms');
});
