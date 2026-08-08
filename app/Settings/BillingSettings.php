<?php

namespace App\Settings;

use Spatie\LaravelSettings\Settings;

class BillingSettings extends Settings
{
    public int $days_in_month;

    public int $rent_reminder_days_before;

    public int $rent_overdue_reminder_days_after;

    public int $rent_overdue_reminder_repeat_days;

    public static function group(): string
    {
        return 'billing';
    }
}
