<?php

namespace App\Listeners;

use Illuminate\Auth\Events\Login;

class LogSuccessfulLogin
{
    public function handle(Login $event): void
    {
        activity()
            ->useLog('auth')
            ->causedBy($event->user->getAuthIdentifier())
            ->log('Logged in.');
    }
}
