<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('permissions', function (Blueprint $table) {
            $table->string('label')->after('name');
            $table->foreignId('permission_category_id')->nullable()->after('label')
                ->constrained('permission_categories')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('permissions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('permission_category_id');
            $table->dropColumn('label');
        });
    }
};
