<?php

use Spatie\LaravelSettings\Migrations\SettingsMigration;

return new class extends SettingsMigration
{
    public function up(): void
    {
        // Matches the app's hardcoded default so existing installs see no
        // visual change until an admin picks a custom primary color.
        $this->migrator->add('branding.primary_color', '#13181a');
    }

    public function down(): void
    {
        $this->migrator->delete('branding.primary_color');
    }
};
