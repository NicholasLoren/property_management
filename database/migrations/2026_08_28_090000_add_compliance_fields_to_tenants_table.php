<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->string('type')->default('individual')->after('name');
            $table->string('tin')->nullable()->after('id_number');
            $table->string('id_document_type')->nullable()->after('tin');
            $table->string('contact_person_name')->nullable()->after('notes');
            $table->string('contact_person_phone')->nullable()->after('contact_person_name');
            $table->string('contact_person_email')->nullable()->after('contact_person_phone');
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn([
                'type',
                'tin',
                'id_document_type',
                'contact_person_name',
                'contact_person_phone',
                'contact_person_email',
            ]);
        });
    }
};
