<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['properties', 'units', 'documents', 'transactions'] as $table) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->string('code')->nullable()->unique()->after('id');
            });
        }
    }

    public function down(): void
    {
        foreach (['properties', 'units', 'documents', 'transactions'] as $table) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->dropColumn('code');
            });
        }
    }
};
