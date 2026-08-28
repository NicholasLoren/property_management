<?php

namespace App\Settings;

use Spatie\LaravelSettings\Settings;

class ComplianceSettings extends Settings
{
    public bool $enabled;

    public static function group(): string
    {
        return 'compliance';
    }
}
