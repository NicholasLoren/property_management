<?php

namespace App\Settings;

use Spatie\LaravelSettings\Settings;

class GeneralSettings extends Settings
{
    public string $company_name;

    public string $support_email;

    public string $address;

    public string $phone;

    public string $default_currency;

    public string $timezone;

    public int $trash_retention_days;

    public static function group(): string
    {
        return 'general';
    }
}
