<?php

use Spatie\LaravelSettings\Migrations\SettingsMigration;

return new class extends SettingsMigration
{
    public function up(): void
    {
        $this->migrator->add('general.company_name', 'Steward Property Group');
        $this->migrator->add('general.support_email', 'support@example.com');
        $this->migrator->add('general.default_currency', 'UGX');
        $this->migrator->add('general.timezone', 'Africa/Kampala');
        $this->migrator->add('general.trash_retention_days', 30);
    }
};
