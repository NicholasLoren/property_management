<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Tenancy Agreement{{ $lease->lease_number ? " {$lease->lease_number}" : '' }}</title>
    <style>
        body {
            font-family: sans-serif;
            font-size: 11px;
            color: #13181a;
            line-height: 1.5;
        }
        .brand-header {
            background-color: {{ $accentColor }};
            color: #ffffff;
            padding: 10px 14px;
            font-size: 13px;
            font-weight: bold;
            text-transform: uppercase;
            margin: 0 0 16px;
        }
        .brand-header img {
            height: 18px;
            width: auto;
            vertical-align: middle;
            margin-right: 8px;
        }
        .brand-header span {
            vertical-align: middle;
        }
        h1 {
            font-size: 17px;
            margin: 0 0 2px;
        }
        p.meta {
            margin: 0 0 18px;
            color: #576057;
            font-size: 10px;
        }
        h2 {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: {{ $accentColor }};
            border-bottom: 1px solid #dbe0d9;
            padding-bottom: 4px;
            margin: 18px 0 8px;
        }
        table.parties {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 6px;
        }
        table.parties td {
            vertical-align: top;
            width: 50%;
            padding: 0 10px 0 0;
        }
        table.facts {
            width: 100%;
            border-collapse: collapse;
        }
        table.facts td {
            padding: 4px 8px 4px 0;
            border-bottom: 1px solid #eef1ed;
        }
        table.facts td.label {
            width: 38%;
            color: #576057;
        }
        ol.clauses {
            margin: 0;
            padding-left: 16px;
        }
        ol.clauses li {
            margin-bottom: 8px;
        }
        table.signatures {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
        }
        table.signatures td {
            width: 50%;
            vertical-align: bottom;
            padding: 0 10px 14px 0;
        }
        .sig-box {
            border-bottom: 1px solid #13181a;
            height: 46px;
            display: flex;
            align-items: flex-end;
        }
        .sig-box img {
            max-height: 44px;
            max-width: 90%;
        }
        .sig-caption {
            margin-top: 4px;
            font-size: 9.5px;
            color: #576057;
        }
        .not-signed {
            font-size: 9.5px;
            color: #8a9188;
            font-style: italic;
        }
    </style>
</head>
<body>
    <p class="brand-header">
        @if (! empty($logoDataUri))
            <img src="{{ $logoDataUri }}" alt="">
        @endif
        <span>{{ $headerText }}</span>
    </p>

    <h1>Tenancy Agreement</h1>
    <p class="meta">
        @if ($lease->lease_number)
            {{ $lease->lease_number }} &middot;
        @endif
        Generated {{ now()->setTimezone(app(\App\Settings\GeneralSettings::class)->timezone)->toDayDateTimeString() }}
    </p>

    <h2>Parties</h2>
    <table class="parties">
        <tr>
            <td>
                <strong>Landlord</strong><br>
                {{ $landlord?->name ?? '—' }}<br>
                @php
                    $landlordDetail = $landlord?->landlordDetail;
                @endphp
                @if ($landlordDetail)
                    {{ $landlordDetail->type->label() }}
                    @if ($landlordDetail->id_number)
                        &middot; {{ $landlordDetail->type->value === 'company' ? 'Reg. no.' : 'ID no.' }} {{ $landlordDetail->id_number }}
                    @endif
                    <br>
                    @if ($landlordDetail->tin)
                        TIN: {{ $landlordDetail->tin }}<br>
                    @endif
                    @if ($landlordDetail->address)
                        {{ $landlordDetail->address }}<br>
                    @endif
                @endif
                @if ($landlord?->email)
                    {{ $landlord->email }}
                @endif
            </td>
            <td>
                <strong>Tenant{{ $lease->tenants->count() === 1 ? '' : 's' }}</strong><br>
                @forelse ($lease->tenants as $tenant)
                    {{ $tenant->name }} ({{ $tenant->type->label() }})<br>
                    @if ($tenant->id_number)
                        {{ $tenant->type->value === 'company' ? 'Reg. no.' : 'ID no.' }} {{ $tenant->id_number }}<br>
                    @endif
                    @if ($tenant->tin)
                        TIN: {{ $tenant->tin }}<br>
                    @endif
                    @if ($tenant->type->value === 'company' && $tenant->contact_person_name)
                        Contact: {{ $tenant->contact_person_name }}
                        @if ($tenant->contact_person_phone) &middot; {{ $tenant->contact_person_phone }} @endif
                        <br>
                    @endif
                    @if ($tenant->phone)
                        {{ $tenant->phone }}<br>
                    @endif
                    @if (! $loop->last)<br>@endif
                @empty
                    —
                @endforelse
            </td>
        </tr>
    </table>

    <h2>Premises &amp; Term</h2>
    <table class="facts">
        <tr>
            <td class="label">Property</td>
            <td>{{ $lease->unit?->property?->name ?? '—' }}</td>
        </tr>
        <tr>
            <td class="label">Unit</td>
            <td>{{ $lease->unit?->name ?? '—' }}</td>
        </tr>
        @if ($lease->unit?->property?->address)
            <tr>
                <td class="label">Address</td>
                <td>{{ $lease->unit->property->address }}</td>
            </tr>
        @endif
        <tr>
            <td class="label">Lease term</td>
            <td>{{ $lease->start_date->toFormattedDateString() }} to {{ $lease->end_date->toFormattedDateString() }}</td>
        </tr>
    </table>

    <h2>Rent &amp; Deposit</h2>
    <table class="facts">
        <tr>
            <td class="label">Rent</td>
            <td>{{ number_format((float) $lease->rent_amount, 2) }} / {{ strtolower($lease->billing_period->label()) }}, due on day {{ $lease->billing_day }} of each period</td>
        </tr>
        @if ($lease->security_deposit)
            <tr>
                <td class="label">Security deposit</td>
                <td>{{ number_format((float) $lease->security_deposit, 2) }}</td>
            </tr>
        @endif
    </table>

    <h2>Terms</h2>
    <ol class="clauses">
        <li>The Tenant agrees to pay rent in full, in advance, for each billing period on or before the due date stated above.</li>
        <li>The security deposit (where applicable) is held against damage beyond fair wear and tear, and unpaid amounts owed at the end of the tenancy, and is refundable subject to inspection.</li>
        <li>The Tenant is responsible for keeping the premises in good condition and for reporting maintenance issues promptly; the Landlord is responsible for repairs not caused by the Tenant's negligence or misuse.</li>
        <li>Either party must give at least 30 days' written notice to end a month-to-month tenancy, or as otherwise provided by the lease term above for a fixed term.</li>
        <li>The Tenant may not sublet the premises or assign this agreement without the Landlord's prior written consent.</li>
        <li>This agreement is governed by the laws of the Republic of Uganda.</li>
    </ol>

    @if ($lease->notes)
        <h2>Additional Notes</h2>
        <p>{{ $lease->notes }}</p>
    @endif

    <h2>Signatures</h2>
    @php
        $landlordSignature = $lease->signatures->firstWhere('signer_role', \App\Enums\SignerRole::Landlord);
    @endphp
    <table class="signatures">
        <tr>
            <td>
                <div class="sig-box">
                    @if ($landlordSignature)
                        <img src="{{ $landlordSignature->signature_image }}" alt="">
                    @endif
                </div>
                <div class="sig-caption">
                    Landlord — {{ $landlord?->name ?? '—' }}
                    @if ($landlordSignature)
                        <br>Signed {{ $landlordSignature->signed_at->toDayDateTimeString() }}
                    @else
                        <br><span class="not-signed">Not yet signed</span>
                    @endif
                </div>
            </td>
            <td>
                @forelse ($lease->tenants as $tenant)
                    @php
                        $tenantSignature = $lease->signatures
                            ->where('signer_role', \App\Enums\SignerRole::Tenant)
                            ->firstWhere('tenant_id', $tenant->id);
                    @endphp
                    <div class="sig-box">
                        @if ($tenantSignature)
                            <img src="{{ $tenantSignature->signature_image }}" alt="">
                        @endif
                    </div>
                    <div class="sig-caption">
                        Tenant — {{ $tenant->name }}
                        @if ($tenantSignature)
                            <br>Signed {{ $tenantSignature->signed_at->toDayDateTimeString() }}
                        @else
                            <br><span class="not-signed">Not yet signed</span>
                        @endif
                    </div>
                @empty
                    <span class="not-signed">No tenant on this lease</span>
                @endforelse
            </td>
        </tr>
    </table>
</body>
</html>
