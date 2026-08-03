<?php

namespace App\Listeners;

use Illuminate\Auth\Events\Failed;

class LogFailedLogin
{
    public function handle(Failed $event): void
    {
        $logger = activity()->useLog('auth')
            ->withProperties(['email' => $event->credentials['email'] ?? null]);

        if ($event->user) {
            $logger->causedBy($event->user->getAuthIdentifier());
        } else {
            $logger->causedByAnonymous();
        }

        $logger->log('Failed login attempt.');
    }
}
