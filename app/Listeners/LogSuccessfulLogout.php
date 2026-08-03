<?php

namespace App\Listeners;

use Illuminate\Auth\Events\Logout;

class LogSuccessfulLogout
{
    public function handle(Logout $event): void
    {
        activity()
            ->useLog('auth')
            ->causedBy($event->user->getAuthIdentifier())
            ->log('Logged out.');
    }
}
