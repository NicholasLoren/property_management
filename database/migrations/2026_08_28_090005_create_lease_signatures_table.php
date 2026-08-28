<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lease_signatures', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lease_id')->constrained()->cascadeOnDelete();
            $table->string('signer_role'); // landlord | tenant
            $table->foreignId('tenant_id')->nullable()->constrained()->nullOnDelete();
            $table->string('signer_name');
            // A drawn-signature PNG as a data URI, stored directly rather
            // than as a MediaLibrary file — mirrors how Branding::logoDataUri()
            // already inlines images for DomPDF, and this is a small,
            // single-purpose blob with no "browse/replace" file UX to justify
            // the extra media-library machinery.
            $table->longText('signature_image');
            $table->timestamp('signed_at');
            $table->string('ip_address')->nullable();
            $table->string('user_agent')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lease_signatures');
    }
};
