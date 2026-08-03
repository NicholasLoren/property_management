<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->default('manager')->after('email');
            $table->string('status')->default('active')->after('role');
            $table->timestamp('last_active_at')->nullable()->after('status');
            $table->softDeletes();
            $table->foreignId('deleted_by')->nullable()->after('deleted_at')->constrained('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('deleted_by');
            $table->dropSoftDeletes();
            $table->dropColumn(['role', 'status', 'last_active_at']);
        });
    }
};
