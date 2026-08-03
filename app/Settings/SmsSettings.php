<?php

namespace App\Settings;

use Spatie\LaravelSettings\Settings;

class SmsSettings extends Settings
{
    public bool $enabled;

    public string $africastalking_username;

    public string $africastalking_api_key;

    public string $sender_id;

    public bool $sandbox;

    public static function group(): string
    {
        return 'sms';
    }

    /**
     * @return array<int, string>
     */
    public static function encrypted(): array
    {
        return ['africastalking_api_key'];
    }
}
