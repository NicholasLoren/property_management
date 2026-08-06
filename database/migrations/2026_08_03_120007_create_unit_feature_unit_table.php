<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('unit_feature_unit', function (Blueprint $table) {
            $table->foreignId('unit_id')->constrained()->cascadeOnDelete();
            $table->foreignId('unit_feature_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('quantity')->default(1);
            $table->primary(['unit_id', 'unit_feature_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('unit_feature_unit');
    }
};
