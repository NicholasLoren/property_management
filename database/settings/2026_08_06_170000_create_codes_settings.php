<?php

use Spatie\LaravelSettings\Migrations\SettingsMigration;

return new class extends SettingsMigration
{
    public function up(): void
    {
        $this->migrator->add('codes.property_prefix', 'PROP');
        $this->migrator->add('codes.property_template', '{prefix}-{seq:4}');
        $this->migrator->add('codes.unit_prefix', 'UNIT');
        $this->migrator->add('codes.unit_template', '{prefix}-{seq:4}');
        $this->migrator->add('codes.document_prefix', 'DOC');
        $this->migrator->add('codes.document_template', '{prefix}-{date:Y}-{seq:4}');
        $this->migrator->add('codes.expense_prefix', 'EXP');
        $this->migrator->add('codes.expense_template', '{prefix}-{date:Y}-{seq:4}');
        $this->migrator->add('codes.income_prefix', 'INC');
        $this->migrator->add('codes.income_template', '{prefix}-{date:Y}-{seq:4}');
    }
};
