<?php

namespace App\Settings;

use Spatie\LaravelSettings\Settings;

class BrandingSettings extends Settings
{
    public string $pdf_header_text;

    public string $accent_color;

    public static function group(): string
    {
        return 'branding';
    }
}
