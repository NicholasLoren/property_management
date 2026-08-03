<?php

use Spatie\LaravelSettings\Migrations\SettingsMigration;

return new class extends SettingsMigration
{
    public function up(): void
    {
        $this->migrator->add('branding.pdf_header_text', 'Steward Property Group');
        $this->migrator->add('branding.accent_color', '#1F6F60');
    }
};
