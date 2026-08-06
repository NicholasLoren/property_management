<?php

namespace App\Settings;

use Spatie\LaravelSettings\Settings;

class CodesSettings extends Settings
{
    public string $property_prefix;

    public string $property_template;

    public string $unit_prefix;

    public string $unit_template;

    public string $document_prefix;

    public string $document_template;

    public string $expense_prefix;

    public string $expense_template;

    public string $income_prefix;

    public string $income_template;

    public static function group(): string
    {
        return 'codes';
    }
}
