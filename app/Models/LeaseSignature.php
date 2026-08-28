<?php

namespace App\Models;

use App\Enums\SignerRole;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * One captured signature (drawn, not typed) against a Lease — either the
 * landlord's own, or a tenant's, recorded via one of two paths: staff-
 * witnessed (an authenticated user drives the pad in person) or a remote
 * link a tenant opens without logging in (see LeaseSigningLink). Both paths
 * write the same shape here, so "is this lease fully signed" only ever
 * needs to read one table.
 *
 * @property int $id
 * @property int $lease_id
 * @property SignerRole $signer_role
 * @property int|null $tenant_id
 * @property string $signer_name
 * @property string $signature_image
 * @property Carbon $signed_at
 * @property string|null $ip_address
 * @property string|null $user_agent
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['signer_role', 'tenant_id', 'signer_name', 'signature_image', 'signed_at', 'ip_address', 'user_agent'])]
class LeaseSignature extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'signer_role' => SignerRole::class,
            'signed_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Lease, $this>
     */
    public function lease(): BelongsTo
    {
        return $this->belongsTo(Lease::class);
    }

    /**
     * @return BelongsTo<Tenant, $this>
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
