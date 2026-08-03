<?php

namespace App\Settings;

use Spatie\LaravelSettings\Settings;

class NotificationSettings extends Settings
{
    public bool $email_enabled;

    public bool $sms_enabled;

    public static function group(): string
    {
        return 'notifications';
    }
}
