<?php

use Spatie\LaravelSettings\Migrations\SettingsMigration;

return new class extends SettingsMigration
{
    public function up(): void
    {
        $this->migrator->add('billing.days_in_month', 30);
        $this->migrator->add('billing.rent_reminder_days_before', 3);
        $this->migrator->add('billing.rent_overdue_reminder_days_after', 3);
        $this->migrator->add('billing.rent_overdue_reminder_repeat_days', 3);
    }
};
