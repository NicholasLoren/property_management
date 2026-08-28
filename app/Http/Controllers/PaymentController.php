<?php

namespace App\Http\Controllers;

use App\Enums\PaymentMethod;
use App\Enums\PaymentScheduleStatus;
use App\Enums\PaymentStatus;
use App\Http\Requests\Payments\StorePaymentRequest;
use App\Http\Requests\Payments\UpdatePaymentRequest;
use App\Models\Lease;
use App\Models\Payment;
use App\Models\PaymentSchedule;
use App\Models\Property;
use App\Models\Tenant;
use App\Services\CodeGenerator;
use App\Settings\BrandingSettings;
use App\Settings\GeneralSettings;
use App\Support\Branding;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class PaymentController extends Controller
{
    private const PERIODS = ['this_month', 'last_month', 'last_3_months', 'this_year', 'all_time'];

    public function __construct(private readonly CodeGenerator $codes) {}

    public function index(Request $request): Response
    {
        $filters = $this->parseFilters($request);
        $sort = $request->string('sort', 'payment_date')->value();
        $dir = $request->string('dir', 'desc')->value() === 'asc' ? 'asc' : 'desc';
        $perPage = (int) $request->integer('per_page', 10);
        $perPage = in_array($perPage, [10, 25, 50], true) ? $perPage : 10;

        $query = $filters['tab'] === 'trash'
            ? Payment::onlyTrashed()->with('deletedBy')
            : Payment::query();

        $query->with(['lease.unit.property', 'tenant']);

        if ($filters['search'] !== '') {
            $query->where(fn (Builder $q) => $q->where('reference', 'like', "%{$filters['search']}%")
                ->orWhereHas('tenant', fn (Builder $t) => $t->where('name', 'like', "%{$filters['search']}%"))
                ->orWhereHas('lease.unit', fn (Builder $u) => $u->where('name', 'like', "%{$filters['search']}%"))
                ->orWhereHas('lease.unit.property', fn (Builder $p) => $p->where('name', 'like', "%{$filters['search']}%")));
        }

        if ($filters['tab'] !== 'trash') {
            if ($filters['statuses'] !== []) {
                $query->whereIn('status', $filters['statuses']);
            }

            if ($filters['property'] !== 'all') {
                $query->whereHas('lease.unit', fn (Builder $q) => $q->where('property_id', $filters['property']));
            }

            if ($filters['property_ids'] !== []) {
                $query->whereHas('lease.unit', fn (Builder $q) => $q->whereIn('property_id', $filters['property_ids']));
            }

            if ($filters['tenant_id'] !== null) {
                $query->where('tenant_id', $filters['tenant_id']);
            }

            if ($filters['method'] !== 'all') {
                $query->where('method', $filters['method']);
            }

            if ($filters['period'] !== 'all_time') {
                [$from, $to] = $this->periodRange($filters['period']);
                $query->whereBetween('payment_date', [$from->toDateString(), $to->toDateString()]);
            }
        }

        $sortColumn = $sort === 'amount' ? 'amount' : 'payment_date';
        $query->orderBy($sortColumn, $dir)->orderBy('id');

        $paginator = $query->paginate($perPage)->withQueryString();

        return Inertia::render('payments/index', [
            'payments' => [
                'data' => $paginator->getCollection()
                    ->map(fn (Payment $payment) => $this->transform($payment, $filters['tab'] === 'trash'))
                    ->all(),
                'meta' => [
                    'current_page' => $paginator->currentPage(),
                    'last_page' => $paginator->lastPage(),
                    'per_page' => $paginator->perPage(),
                    'total' => $paginator->total(),
                    'from' => $paginator->firstItem(),
                    'to' => $paginator->lastItem(),
                ],
            ],
            'filters' => [
                'search' => $filters['search'],
                'status' => $filters['statuses'],
                'sort' => $sort,
                'dir' => $dir,
                'per_page' => $perPage,
                'tab' => $filters['tab'],
                'property' => $filters['property'],
                'property_id' => $filters['property_ids'],
                'tenant_id' => $filters['tenant_id'],
                'method' => $filters['method'],
                'period' => $filters['period'],
            ],
            'counts' => [
                'active' => Payment::count(),
                'trash' => Payment::onlyTrashed()->count(),
            ],
            // Closures: skipped entirely on a partial reload that excludes
            // them (search/sort/pagination/filter changes never affect any
            // of these), rather than re-queried on every such request.
            'total_collected' => fn () => (string) Payment::where('status', PaymentStatus::Completed->value)->sum('amount'),
            'statuses' => fn () => $this->statusOptions(),
            'properties' => fn () => $this->propertyOptions(),
            'methods' => fn () => $this->methodOptions(),
            'periods' => fn () => $this->periodOptions(),
        ]);
    }

    /**
     * @return array{tab: string, search: string, statuses: array<int, string>, property: string, property_ids: array<int, string>, tenant_id: string|null, method: string, period: string}
     */
    private function parseFilters(Request $request): array
    {
        $property = $request->string('property', 'all')->value();
        $method = $request->string('method', 'all')->value();
        $period = $request->string('period', 'all_time')->value();
        $tenantId = $request->string('tenant_id')->value();

        return [
            'tab' => $request->string('tab', 'active')->value() === 'trash' ? 'trash' : 'active',
            'search' => $request->string('search')->trim()->value(),
            'statuses' => array_values(array_intersect(
                (array) $request->input('status', []),
                array_column(PaymentStatus::cases(), 'value'),
            )),
            'property' => $property !== '' && ctype_digit($property) ? $property : 'all',
            // Scopes to several properties at once (e.g. a landlord's whole
            // portfolio) — distinct from the single `property` chip above,
            // which drives the visible filter control.
            'property_ids' => array_values(array_filter((array) $request->input('property_id', []))),
            'tenant_id' => $tenantId !== '' && ctype_digit($tenantId) ? $tenantId : null,
            'method' => in_array($method, array_column(PaymentMethod::cases(), 'value'), true) ? $method : 'all',
            'period' => in_array($period, self::PERIODS, true) ? $period : 'all_time',
        ];
    }

    /**
     * @return array{0: Carbon, 1: Carbon}
     */
    private function periodRange(string $period): array
    {
        $now = Carbon::now();

        return match ($period) {
            'this_month' => [$now->copy()->startOfMonth(), $now->copy()->endOfMonth()],
            'last_month' => [
                $now->copy()->subMonthNoOverflow()->startOfMonth(),
                $now->copy()->subMonthNoOverflow()->endOfMonth(),
            ],
            'last_3_months' => [$now->copy()->subMonthsNoOverflow(2)->startOfMonth(), $now->copy()->endOfMonth()],
            'this_year' => [$now->copy()->startOfYear(), $now->copy()->endOfYear()],
            default => [$now->copy()->startOfMonth(), $now->copy()->endOfMonth()],
        };
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function propertyOptions(): array
    {
        return Property::query()
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (Property $property): array => ['value' => (string) $property->id, 'label' => $property->name])
            ->all();
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function periodOptions(): array
    {
        return [
            ['value' => 'this_month', 'label' => 'This Month'],
            ['value' => 'last_month', 'label' => 'Last Month'],
            ['value' => 'last_3_months', 'label' => 'Last 3 Months'],
            ['value' => 'this_year', 'label' => 'This Year'],
            ['value' => 'all_time', 'label' => 'All Time'],
        ];
    }

    public function create(GeneralSettings $settings): Response
    {
        return Inertia::render('payments/form', [
            'leases' => $this->leaseOptions($settings->default_currency),
            'methods' => $this->methodOptions(),
            'statuses' => $this->statusOptions(),
        ]);
    }

    public function store(StorePaymentRequest $request): RedirectResponse
    {
        /** @var array<int, string> $scheduleIds */
        $scheduleIds = $request->validated('payment_schedule_ids');
        $schedules = PaymentSchedule::query()->whereIn('id', $scheduleIds)->orderBy('period_start')->get();

        $baseAttributes = [
            'lease_id' => $request->validated('lease_id'),
            'tenant_id' => $request->validated('tenant_id'),
            'payment_date' => $request->validated('payment_date'),
            'method' => $request->validated('method'),
            'status' => $request->validated('status'),
            'reference' => $request->validated('reference'),
            'notes' => $request->validated('notes'),
            'created_by' => $request->user()->id,
        ];

        // A single selected period keeps today's behaviour: the amount
        // typed in is trusted as-is, which is how a deliberate partial
        // payment against that one period gets recorded. Selecting several
        // periods at once means "settle these in full" — the amount field
        // is a computed display in that case, so each created payment is
        // for that period's own exact remaining balance instead.
        if ($schedules->count() === 1) {
            $payment = Payment::create([
                ...$baseAttributes,
                'payment_schedule_id' => $schedules->first()->id,
                'amount' => $request->validated('amount'),
            ]);

            $this->issueReceipt($request, $payment);
        } else {
            $hasUpload = $request->hasFile('receipt');
            $sharedReceiptMedia = null;

            foreach ($schedules as $schedule) {
                $paid = (float) $schedule->payments()->where('status', PaymentStatus::Completed)->sum('amount');
                $balance = round((float) $schedule->amount_expected - $paid, 2);

                $payment = Payment::create([
                    ...$baseAttributes,
                    'payment_schedule_id' => $schedule->id,
                    'amount' => $balance,
                ]);
                $payment->forceFill(['receipt_number' => $this->codes->generate('receipt', $payment)])->save();

                if ($hasUpload) {
                    // The upload only survives being read once (addMediaFromRequest
                    // moves the temp file on first use), so every payment after
                    // the first gets the same receipt via a media copy instead.
                    if ($sharedReceiptMedia === null) {
                        $this->syncReceipt($request, $payment);
                        $sharedReceiptMedia = $payment->getFirstMedia('receipt');
                    } else {
                        $sharedReceiptMedia->copy($payment, 'receipt');
                    }
                } else {
                    // No manual override — each payment gets its own generated
                    // receipt reflecting its own amount and period.
                    $this->generateReceiptPdf($payment);
                }
            }
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Payment was recorded.']);

        return to_route('payments.index');
    }

    public function show(Payment $payment): Response
    {
        $payment->load(['lease.unit.property', 'lease.tenants', 'tenant', 'paymentSchedule', 'createdBy', 'media']);

        return Inertia::render('payments/show', [
            'payment' => $this->transformForShow($payment),
        ]);
    }

    public function edit(Payment $payment, GeneralSettings $settings): Response
    {
        $payment->load(['lease.unit.property', 'lease.tenants', 'media']);

        return Inertia::render('payments/form', [
            'payment' => $this->transformForForm($payment, $settings->default_currency),
            'leases' => $this->leaseOptions($settings->default_currency),
            'methods' => $this->methodOptions(),
            'statuses' => $this->statusOptions(),
        ]);
    }

    public function update(UpdatePaymentRequest $request, Payment $payment): RedirectResponse
    {
        $payment->update([
            'payment_schedule_id' => $request->validated('payment_schedule_id'),
            'tenant_id' => $request->validated('tenant_id'),
            'amount' => $request->validated('amount'),
            'payment_date' => $request->validated('payment_date'),
            'method' => $request->validated('method'),
            'status' => $request->validated('status'),
            'reference' => $request->validated('reference'),
            'notes' => $request->validated('notes'),
        ]);

        if ($request->boolean('receipt_remove')) {
            $payment->clearMediaCollection('receipt');
        }

        if ($request->hasFile('receipt')) {
            $this->syncReceipt($request, $payment);
        } elseif ($payment->getFirstMedia('receipt') === null) {
            // No manual file on hand — the system always keeps a receipt on
            // file unless staff deliberately supply one of their own.
            $this->generateReceiptPdf($payment);
        }

        if ($payment->receipt_number === null) {
            $payment->forceFill(['receipt_number' => $this->codes->generate('receipt', $payment)])->save();
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Payment was updated.']);

        return to_route('payments.index');
    }

    public function destroy(Request $request, Payment $payment): RedirectResponse
    {
        $payment->forceFill(['deleted_by' => $request->user()->id])->save();
        $payment->delete();

        return back();
    }

    public function restore(Payment $payment): RedirectResponse
    {
        $payment->restore();
        $payment->forceFill(['deleted_by' => null])->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Payment was restored.']);

        return back();
    }

    public function forceDelete(Payment $payment): RedirectResponse
    {
        $payment->forceDelete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Payment was permanently deleted.']);

        return back();
    }

    private function syncReceipt(Request $request, Payment $payment): void
    {
        if (! $request->hasFile('receipt')) {
            return;
        }

        $payment->addMediaFromRequest('receipt')->toMediaCollection('receipt');
    }

    /**
     * Assigns the payment its reference number and, unless staff uploaded
     * their own file, generates its receipt PDF — the system is always the
     * source of a receipt unless a manual upload deliberately overrides it.
     */
    private function issueReceipt(Request $request, Payment $payment): void
    {
        $payment->forceFill(['receipt_number' => $this->codes->generate('receipt', $payment)])->save();

        if ($request->hasFile('receipt')) {
            $this->syncReceipt($request, $payment);

            return;
        }

        $this->generateReceiptPdf($payment);
    }

    private function generateReceiptPdf(Payment $payment): void
    {
        $payment->loadMissing(['lease.unit.property', 'tenant', 'paymentSchedule']);

        $branding = app(BrandingSettings::class);

        $pdf = Pdf::loadView('payments.receipt', [
            'payment' => $payment,
            'accentColor' => $branding->accent_color,
            'logoDataUri' => Branding::logoDataUri(),
            'headerText' => $branding->pdf_header_text,
        ]);

        $payment->addMediaFromString($pdf->output())
            ->usingFileName(($payment->receipt_number ?? "receipt-{$payment->id}").'.pdf')
            ->toMediaCollection('receipt');
    }

    /**
     * @return array<string, mixed>
     */
    private function transform(Payment $payment, bool $withTrashMeta = false): array
    {
        $data = [
            'id' => $payment->id,
            'unit_name' => $payment->lease?->unit?->name,
            'property_name' => $payment->lease?->unit?->property?->name,
            'tenant_name' => $payment->tenant?->name,
            'amount' => (string) $payment->amount,
            'payment_date' => $payment->payment_date->toDateString(),
            'method_label' => $payment->method->label(),
            'status' => $payment->status->value,
            'status_label' => $payment->status->label(),
        ];

        if ($withTrashMeta) {
            $data['deleted_at'] = $payment->deleted_at?->toIso8601String();
            $data['deleted_by_name'] = $payment->deletedBy?->name;
        }

        return $data;
    }

    /**
     * @return array<string, mixed>
     */
    private function transformForShow(Payment $payment): array
    {
        $receipt = $payment->getFirstMedia('receipt');

        return [
            'id' => $payment->id,
            'receipt_number' => $payment->receipt_number,
            'reference' => $payment->reference,
            'amount' => (string) $payment->amount,
            'payment_date' => $payment->payment_date->toDateString(),
            'method' => $payment->method->value,
            'method_label' => $payment->method->label(),
            'status' => $payment->status->value,
            'status_label' => $payment->status->label(),
            'notes' => $payment->notes,
            'lease_id' => $payment->lease_id,
            'unit_id' => $payment->lease?->unit_id,
            'unit_name' => $payment->lease?->unit?->name,
            'property_id' => $payment->lease?->unit?->property_id,
            'property_name' => $payment->lease?->unit?->property?->name,
            'tenant_id' => $payment->tenant_id,
            'tenant_name' => $payment->tenant?->name,
            'lease_tenant_names' => $payment->lease?->tenants->pluck('name')->join(', '),
            'schedule_period' => $payment->paymentSchedule !== null
                ? "{$payment->paymentSchedule->period_start->toDateString()} – {$payment->paymentSchedule->period_end->toDateString()}"
                : null,
            'created_by_name' => $payment->createdBy?->name,
            'created_at' => $payment->created_at?->toIso8601String(),
            'receipt' => $receipt ? ['name' => $receipt->file_name, 'url' => $receipt->getUrl()] : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformForForm(Payment $payment, string $currency): array
    {
        $receipt = $payment->getFirstMedia('receipt');

        $schedulePeriods = $payment->lease?->paymentSchedules()
            ->where(fn (Builder $q) => $q
                ->whereIn('status', [PaymentScheduleStatus::Pending->value, PaymentScheduleStatus::Partial->value])
                ->orWhere('id', $payment->payment_schedule_id))
            ->orderBy('period_start')
            ->get() ?? collect();

        return [
            'id' => $payment->id,
            'lease_id' => (string) $payment->lease_id,
            'lease_label' => $payment->lease !== null
                ? "{$payment->lease->unit?->name} — {$payment->lease->unit?->property?->name}"
                : null,
            'payment_schedule_id' => $payment->payment_schedule_id !== null ? (string) $payment->payment_schedule_id : null,
            'lease_schedule_periods' => $schedulePeriods->map(fn (PaymentSchedule $schedule) => [
                'value' => (string) $schedule->id,
                'label' => sprintf(
                    '%s – %s (%s %s, %s)',
                    $schedule->period_start->format('j M Y'),
                    $schedule->period_end->format('j M Y'),
                    $currency,
                    number_format((float) $schedule->amount_expected),
                    $schedule->status->label(),
                ),
            ])->all(),
            'tenant_id' => $payment->tenant_id !== null ? (string) $payment->tenant_id : null,
            'lease_tenants' => $payment->lease?->tenants->map(fn (Tenant $tenant) => [
                'value' => (string) $tenant->id,
                'label' => $tenant->name,
            ])->all() ?? [],
            'amount' => (string) $payment->amount,
            'payment_date' => $payment->payment_date->toDateString(),
            'method' => $payment->method->value,
            'status' => $payment->status->value,
            'reference' => $payment->reference,
            'notes' => $payment->notes,
            'receipt' => $receipt ? ['name' => $receipt->file_name, 'url' => $receipt->getUrl()] : null,
        ];
    }

    /**
     * @return array<int, array{value: string, label: string, tenants: array<int, array{value: string, label: string}>, schedule_periods: array<int, array{value: string, label: string, balance: string}>}>
     */
    private function leaseOptions(string $currency): array
    {
        return Lease::query()
            ->with(['unit.property', 'tenants'])
            ->with('paymentSchedules', function (Relation $query): void {
                $query->whereIn('status', [PaymentScheduleStatus::Pending->value, PaymentScheduleStatus::Partial->value])
                    ->withSum(
                        ['payments as paid_amount' => fn (Builder $q) => $q->where('status', PaymentStatus::Completed)],
                        'amount',
                    )
                    ->orderBy('period_start');
            })
            ->orderByDesc('start_date')->get()
            ->map(fn (Lease $lease) => [
                'value' => (string) $lease->id,
                'label' => "{$lease->unit?->name} — {$lease->unit?->property?->name}",
                'tenants' => $lease->tenants->map(fn (Tenant $tenant) => [
                    'value' => (string) $tenant->id,
                    'label' => $tenant->name,
                ])->all(),
                'schedule_periods' => $lease->paymentSchedules->map(function (PaymentSchedule $schedule) use ($currency) {
                    $balance = round((float) $schedule->amount_expected - (float) ($schedule->paid_amount ?? 0), 2);

                    return [
                        'value' => (string) $schedule->id,
                        'label' => sprintf(
                            '%s – %s (%s %s due, %s)',
                            $schedule->period_start->format('j M Y'),
                            $schedule->period_end->format('j M Y'),
                            $currency,
                            number_format($balance),
                            $schedule->status->label(),
                        ),
                        'balance' => number_format($balance, 2, '.', ''),
                    ];
                })->all(),
            ])
            ->all();
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function methodOptions(): array
    {
        return array_map(
            fn (PaymentMethod $method) => ['value' => $method->value, 'label' => $method->label()],
            PaymentMethod::cases(),
        );
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function statusOptions(): array
    {
        return array_map(
            fn (PaymentStatus $status) => ['value' => $status->value, 'label' => $status->label()],
            PaymentStatus::cases(),
        );
    }
}
