<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A single-row table that exists only to anchor the company logo media
     * attachment (Spatie Media Library needs an Eloquent model to attach
     * files to; settings classes are plain DTOs and can't hold one).
     */
    public function up(): void
    {
        Schema::create('company_profiles', function (Blueprint $table) {
            $table->id();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('company_profiles');
    }
};
