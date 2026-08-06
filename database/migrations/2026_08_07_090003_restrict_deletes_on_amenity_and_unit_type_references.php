<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * `units.unit_type_id` (nullOnDelete) and `property_amenity.amenity_id`
     * (cascadeOnDelete) predate the Extras module, which added a "can't
     * delete — still in use" friendly error to Amenity/UnitType force-delete
     * (matching Category's restrictOnDelete on transactions/documents).
     * Without this, force-deleting an in-use Amenity/UnitType silently
     * succeeds instead of throwing, so the friendly-error branch never ran.
     */
    public function up(): void
    {
        Schema::table('units', function (Blueprint $table) {
            $table->dropForeign(['unit_type_id']);
        });
        Schema::table('units', function (Blueprint $table) {
            $table->foreign('unit_type_id')->references('id')->on('unit_types')->restrictOnDelete();
        });

        Schema::table('property_amenity', function (Blueprint $table) {
            $table->dropForeign(['amenity_id']);
        });
        Schema::table('property_amenity', function (Blueprint $table) {
            $table->foreign('amenity_id')->references('id')->on('amenities')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('units', function (Blueprint $table) {
            $table->dropForeign(['unit_type_id']);
        });
        Schema::table('units', function (Blueprint $table) {
            $table->foreign('unit_type_id')->references('id')->on('unit_types')->nullOnDelete();
        });

        Schema::table('property_amenity', function (Blueprint $table) {
            $table->dropForeign(['amenity_id']);
        });
        Schema::table('property_amenity', function (Blueprint $table) {
            $table->foreign('amenity_id')->references('id')->on('amenities')->cascadeOnDelete();
        });
    }
};
