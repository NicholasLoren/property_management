<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lease_id')->constrained()->cascadeOnDelete();
            $table->date('period_start');
            $table->date('period_end');
            $table->decimal('amount_expected', 12, 2);
            $table->string('status')->default('pending');
            $table->timestamp('last_due_reminder_sent_at')->nullable();
            $table->timestamp('last_overdue_reminder_sent_at')->nullable();
            $table->timestamps();

            $table->unique(['lease_id', 'period_start']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_schedules');
    }
};
