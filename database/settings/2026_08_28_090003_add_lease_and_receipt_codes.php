<?php

use Spatie\LaravelSettings\Migrations\SettingsMigration;

return new class extends SettingsMigration
{
    public function up(): void
    {
        $this->migrator->add('codes.lease_prefix', 'LEASE');
        $this->migrator->add('codes.lease_template', '{prefix}-{seq:4}');
        $this->migrator->add('codes.receipt_prefix', 'RCT');
        $this->migrator->add('codes.receipt_template', '{prefix}-{date:Y}-{seq:4}');
    }
};
