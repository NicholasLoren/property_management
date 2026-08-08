<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leases', function (Blueprint $table) {
            $table->unsignedTinyInteger('billing_day')->nullable()->after('billing_period');
            $table->unsignedTinyInteger('custom_interval_months')->nullable()->after('billing_day');
        });

        // Existing leases didn't have an explicit due day — anchor it to
        // the day of month they actually started on. Done in PHP (not a
        // raw DAY(start_date) update) so it works identically on both
        // MySQL and the sqlite connection the test suite runs against.
        DB::table('leases')->select('id', 'start_date')->orderBy('id')->each(function (object $lease): void {
            DB::table('leases')->where('id', $lease->id)->update([
                'billing_day' => Carbon::parse($lease->start_date)->day,
            ]);
        });

        Schema::table('leases', function (Blueprint $table) {
            $table->unsignedTinyInteger('billing_day')->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('leases', function (Blueprint $table) {
            $table->dropColumn(['billing_day', 'custom_interval_months']);
        });
    }
};
