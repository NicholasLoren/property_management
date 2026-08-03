<?php

use Spatie\LaravelSettings\Migrations\SettingsMigration;

return new class extends SettingsMigration
{
    public function up(): void
    {
        $this->migrator->add('notifications.email_enabled', true);
        $this->migrator->add('notifications.sms_enabled', false);
    }
};
