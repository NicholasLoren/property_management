<?php

namespace App\Http\Controllers;

use App\Enums\SignerRole;
use App\Models\LeaseSigningLink;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Public, unauthenticated — a tenant reaches this via a single-use link
 * emailed/texted to them (see LeaseSigningRequested), with no login of
 * their own. Only what's needed to review and sign is exposed here.
 */
class SigningController extends Controller
{
    public function show(string $token): Response
    {
        $link = LeaseSigningLink::query()->where('token', $token)->first();

        if ($link === null) {
            return Inertia::render('signing/show', ['status' => 'not_found']);
        }

        if (! $link->isValid()) {
            return Inertia::render('signing/show', [
                'status' => $link->used_at !== null ? 'used' : 'expired',
            ]);
        }

        $link->load(['lease.unit.property', 'tenant']);
        $lease = $link->lease;

        return Inertia::render('signing/show', [
            'status' => 'ready',
            'token' => $token,
            'tenantName' => $link->tenant->name,
            'lease' => [
                'unit_label' => $lease->unit !== null
                    ? "{$lease->unit->name} — {$lease->unit->property?->name}"
                    : null,
                'start_date' => $lease->start_date->toDateString(),
                'end_date' => $lease->end_date->toDateString(),
                'rent_amount' => (string) $lease->rent_amount,
                'billing_period_label' => $lease->billing_period->label(),
                'security_deposit' => $lease->security_deposit !== null ? (string) $lease->security_deposit : null,
            ],
        ]);
    }

    public function store(Request $request, string $token): RedirectResponse
    {
        $link = LeaseSigningLink::query()->where('token', $token)->first();

        if ($link === null || ! $link->isValid()) {
            throw ValidationException::withMessages([
                'signature_image' => 'This signing link is no longer valid.',
            ]);
        }

        $data = $request->validate([
            'signature_image' => ['required', 'string', 'starts_with:data:image/png;base64,'],
        ]);

        $link->lease->signatures()->create([
            'signer_role' => SignerRole::Tenant,
            'tenant_id' => $link->tenant_id,
            'signer_name' => $link->tenant->name,
            'signature_image' => $data['signature_image'],
            'signed_at' => now(),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        $link->forceFill(['used_at' => now()])->save();

        return back();
    }
}
