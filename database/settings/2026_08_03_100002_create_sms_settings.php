<?php

use Spatie\LaravelSettings\Migrations\SettingsMigration;

return new class extends SettingsMigration
{
    public function up(): void
    {
        $this->migrator->add('sms.enabled', false);
        $this->migrator->add('sms.africastalking_username', '');
        $this->migrator->addEncrypted('sms.africastalking_api_key', '');
        $this->migrator->add('sms.sender_id', '');
        $this->migrator->add('sms.sandbox', true);
    }
};
