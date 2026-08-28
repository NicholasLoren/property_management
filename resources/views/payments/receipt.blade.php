<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Receipt{{ $payment->receipt_number ? " {$payment->receipt_number}" : '' }}</title>
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
        .amount-box {
            border: 1px solid #dbe0d9;
            border-radius: 6px;
            padding: 14px 16px;
            margin-bottom: 18px;
        }
        .amount-box .label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: #576057;
        }
        .amount-box .value {
            font-size: 22px;
            font-weight: bold;
            color: {{ $accentColor }};
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
            width: 40%;
            color: #576057;
        }
        p.footnote {
            margin-top: 24px;
            font-size: 9.5px;
            color: #8a9188;
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

    <h1>Payment Receipt</h1>
    <p class="meta">
        @if ($payment->receipt_number)
            {{ $payment->receipt_number }} &middot;
        @endif
        Issued {{ now()->setTimezone(app(\App\Settings\GeneralSettings::class)->timezone)->toDayDateTimeString() }}
    </p>

    <div class="amount-box">
        <div class="label">Amount received</div>
        <div class="value">{{ number_format((float) $payment->amount, 2) }}</div>
    </div>

    <table class="facts">
        <tr>
            <td class="label">Received from</td>
            <td>{{ $payment->tenant?->name ?? '—' }}</td>
        </tr>
        <tr>
            <td class="label">Property</td>
            <td>{{ $payment->lease?->unit?->property?->name ?? '—' }}</td>
        </tr>
        <tr>
            <td class="label">Unit</td>
            <td>{{ $payment->lease?->unit?->name ?? '—' }}</td>
        </tr>
        @if ($payment->paymentSchedule)
            <tr>
                <td class="label">Period</td>
                <td>
                    {{ $payment->paymentSchedule->period_start->toFormattedDateString() }}
                    to {{ $payment->paymentSchedule->period_end->toFormattedDateString() }}
                </td>
            </tr>
        @endif
        <tr>
            <td class="label">Payment date</td>
            <td>{{ $payment->payment_date->toFormattedDateString() }}</td>
        </tr>
        <tr>
            <td class="label">Method</td>
            <td>{{ $payment->method->label() }}</td>
        </tr>
        @if ($payment->reference)
            <tr>
                <td class="label">Reference</td>
                <td>{{ $payment->reference }}</td>
            </tr>
        @endif
    </table>

    <p class="footnote">This receipt was generated automatically and reflects the payment record at the time it was issued.</p>
</body>
</html>
