<?php

use App\Http\Controllers\DocsController;
use Illuminate\Support\Facades\Route;

// Public: the docs need to be readable by someone who hasn't logged in yet
// (e.g. "how do I log in"), so this intentionally sits outside the
// auth/verified middleware group used by the rest of the app.
Route::get('docs', [DocsController::class, 'index'])->name('docs.index');
Route::get('docs/{module}/{page}', [DocsController::class, 'show'])->name('docs.show');
