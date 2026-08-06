<?php

use Spatie\LaravelSettings\Migrations\SettingsMigration;

return new class extends SettingsMigration
{
    public function up(): void
    {
        $this->migrator->add('general.address', '');
        $this->migrator->add('general.phone', '');
    }

    public function down(): void
    {
        $this->migrator->delete('general.address');
        $this->migrator->delete('general.phone');
    }
};
