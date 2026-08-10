<?php

namespace App\Http\Controllers;

use App\Enums\LeaseStatus;
use App\Enums\PaymentScheduleStatus;
use App\Enums\PaymentStatus;
use App\Enums\TransactionType;
use App\Enums\UnitStatus;
use App\Exports\ReportExport;
use App\Models\Lease;
use App\Models\Payment;
use App\Models\PaymentSchedule;
use App\Models\Property;
use App\Models\Tenant;
use App\Models\Transaction;
use App\Models\Unit;
use App\Services\PortfolioMetrics;
use App\Settings\BrandingSettings;
use App\Support\Branding;
use App\Support\ReportCatalog;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class ReportController extends Controller
{
    public function __construct(private readonly PortfolioMetrics $metrics) {}

    public function index(): Response
    {
        return Inertia::render('reports/index', [
            'categories' => ReportCatalog::grouped(),
        ]);
    }

    public function show(Request $request, string $type): Response
    {
        $definition = $this->definition($type);
        [$from, $to] = $this->parseFilters($request);
        [$propertyId, $unitId] = $this->parseScope($request);

        return Inertia::render('reports/show', [
            'type' => $type,
            'title' => $definition['title'],
            'description' => $definition['description'],
            'date_filter' => $definition['date_filter'],
            'filters' => [
                'from' => $definition['date_filter'] ? $from->toDateString() : null,
                'to' => $definition['date_filter'] ? $to->toDateString() : null,
                'property_id' => $propertyId !== null ? (string) $propertyId : null,
                'unit_id' => $unitId !== null ? (string) $unitId : null,
            ],
            'properties' => $this->propertyOptions(),
            'units' => $this->unitOptions(),
            ...$this->build($type, $from, $to, $propertyId, $unitId),
        ]);
    }

    public function export(Request $request, string $type, string $format, BrandingSettings $branding): HttpResponse
    {
        $definition = $this->definition($type);
        [$from, $to] = $this->parseFilters($request);
        [$propertyId, $unitId] = $this->parseScope($request);

        $report = $this->build($type, $from, $to, $propertyId, $unitId);
        $headings = array_map(fn (array $column) => $column['label'], $report['columns']);
        $keys = array_map(fn (array $column) => $column['key'], $report['columns']);

        $rows = array_map(
            fn (array $row) => array_map(fn (string $key) => (string) ($row[$key] ?? ''), $keys),
            $report['rows'],
        );

        $export = new ReportExport($rows, $headings);
        $filename = str_replace('-', '_', $type);

        return $format === 'excel'
            ? $export->download("{$filename}.xlsx")
            : Pdf::loadView('exports.pdf-table', [
                'title' => $definition['title'],
                'headings' => $headings,
                'rows' => $rows,
                'headerText' => $branding->pdf_header_text,
                'accentColor' => $branding->accent_color,
                'logoDataUri' => Branding::logoDataUri(),
            ])->download("{$filename}.pdf");
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function propertyOptions(): array
    {
        return Property::query()->orderBy('name')->get(['id', 'name'])
            ->map(fn (Property $p): array => ['value' => (string) $p->id, 'label' => $p->name])
            ->all();
    }

    /**
     * @return array<int, array{value: string, label: string, property_id: string}>
     */
    private function unitOptions(): array
    {
        return Unit::query()->orderBy('name')->get(['id', 'name', 'property_id'])
            ->map(fn (Unit $u): array => [
                'value' => (string) $u->id,
                'label' => $u->name,
                'property_id' => (string) $u->property_id,
            ])
            ->all();
    }

    /**
     * @return array{title: string, description: string, icon: string, date_filter: bool, category: string}
     */
    private function definition(string $type): array
    {
        $definitions = ReportCatalog::definitions();

        if (! array_key_exists($type, $definitions)) {
            throw new NotFoundHttpException("Unknown report type \"{$type}\".");
        }

        return $definitions[$type];
    }

    /**
     * @return array{0: Carbon, 1: Carbon}
     */
    private function parseFilters(Request $request): array
    {
        $from = $request->string('from')->value();
        $to = $request->string('to')->value();

        return [
            $from !== '' ? Carbon::parse($from)->startOfDay() : Carbon::now()->startOfMonth(),
            $to !== '' ? Carbon::parse($to)->endOfDay() : Carbon::now()->endOfDay(),
        ];
    }

    /**
     * @return array{0: int|null, 1: int|null}
     */
    private function parseScope(Request $request): array
    {
        return [
            $request->integer('property_id') ?: null,
            $request->integer('unit_id') ?: null,
        ];
    }

    /**
     * Scopes a query on a model that `belongsTo` Lease (Payment, PaymentSchedule)
     * down to a single unit, or every unit under a single property.
     *
     * @template TModel of Model
     *
     * @param  Builder<TModel>  $query
     * @return Builder<TModel>
     */
    private function scopeByLease(Builder $query, ?int $propertyId, ?int $unitId): Builder
    {
        if ($unitId !== null) {
            return $query->whereHas('lease', fn (Builder $q) => $q->where('unit_id', $unitId));
        }

        if ($propertyId !== null) {
            return $query->whereHas('lease.unit', fn (Builder $q) => $q->where('property_id', $propertyId));
        }

        return $query;
    }

    /**
     * Scopes a Lease query (which `belongsTo` Unit directly) down to a
     * single unit, or every unit under a single property.
     *
     * @template TModel of Model
     *
     * @param  Builder<TModel>  $query
     * @return Builder<TModel>
     */
    private function scopeLeases(Builder $query, ?int $propertyId, ?int $unitId): Builder
    {
        if ($unitId !== null) {
            return $query->where('unit_id', $unitId);
        }

        if ($propertyId !== null) {
            return $query->whereHas('unit', fn (Builder $q) => $q->where('property_id', $propertyId));
        }

        return $query;
    }

    /**
     * @return array{columns: array<int, array{key: string, label: string, type: string}>, rows: array<int, array<string, string>>, summary: array<int, array{label: string, value: string, type: string}>|null}
     */
    private function build(string $type, Carbon $from, Carbon $to, ?int $propertyId, ?int $unitId): array
    {
        return match ($type) {
            'income' => $this->incomeReport($from, $to, $propertyId, $unitId),
            'expense' => $this->expenseReport($from, $to, $propertyId),
            'profit-loss' => $this->profitLossReport($from, $to, $propertyId, $unitId),
            'rent-collection' => $this->rentCollectionReport($from, $to, $propertyId, $unitId),
            'rent-arrears' => $this->rentArrearsReport($propertyId, $unitId),
            'advance-payments' => $this->advancePaymentsReport($propertyId, $unitId),
            'tenant-roster' => $this->tenantRosterReport($propertyId, $unitId),
            'new-residents' => $this->newResidentsReport($from, $to, $propertyId, $unitId),
            'expiring-leases' => $this->expiringLeasesReport($propertyId, $unitId),
            'vacancies' => $this->vacanciesReport($propertyId, $unitId),
            'deposits' => $this->depositsReport($propertyId, $unitId),
            default => throw new NotFoundHttpException("Unknown report type \"{$type}\"."),
        };
    }

    /**
     * @return array{columns: array<int, array{key: string, label: string, type: string}>, rows: array<int, array<string, string>>, summary: array<int, array{label: string, value: string, type: string}>}
     */
    private function incomeReport(Carbon $from, Carbon $to, ?int $propertyId, ?int $unitId): array
    {
        $payments = $this->scopeByLease(
            Payment::query()
                ->where('status', PaymentStatus::Completed->value)
                ->whereBetween('payment_date', [$from->toDateString(), $to->toDateString()]),
            $propertyId,
            $unitId,
        )
            ->with('lease.unit.property')
            ->get()
            ->map(fn (Payment $p): array => [
                'date' => $p->payment_date->toDateString(),
                'property' => $p->lease?->unit?->property->name ?? '—',
                'category' => 'Rent',
                'description' => $p->reference ?: 'Rent payment',
                'amount' => (string) $p->amount,
            ]);

        // Transactions are recorded at the property level, not the unit level —
        // a unit-scoped view can't attribute them to a single unit, so they're
        // dropped rather than shown against the wrong unit.
        $transactions = $unitId === null
            ? Transaction::query()
                ->where('type', TransactionType::Income->value)
                ->whereBetween('transaction_date', [$from->toDateString(), $to->toDateString()])
                ->when($propertyId !== null, fn (Builder $q) => $q->where('property_id', $propertyId))
                ->with(['property', 'category'])
                ->get()
                ->map(fn (Transaction $t): array => [
                    'date' => $t->transaction_date->toDateString(),
                    'property' => $t->property->name ?? '—',
                    'category' => $t->category !== null ? $t->category->name : 'Uncategorized',
                    'description' => $t->description ?: '—',
                    'amount' => (string) $t->amount,
                ])
            : collect();

        $rows = $payments->concat($transactions)->sortByDesc('date')->values()->all();

        return [
            'columns' => [
                ['key' => 'date', 'label' => 'Date', 'type' => 'date'],
                ['key' => 'property', 'label' => 'Property', 'type' => 'text'],
                ['key' => 'category', 'label' => 'Category', 'type' => 'text'],
                ['key' => 'description', 'label' => 'Description', 'type' => 'text'],
                ['key' => 'amount', 'label' => 'Amount', 'type' => 'currency'],
            ],
            'rows' => $rows,
            'summary' => [
                ['label' => 'Total income', 'value' => (string) ($payments->sum('amount') + $transactions->sum('amount')), 'type' => 'currency'],
            ],
        ];
    }

    /**
     * @return array{columns: array<int, array{key: string, label: string, type: string}>, rows: array<int, array<string, string>>, summary: array<int, array{label: string, value: string, type: string}>}
     */
    private function expenseReport(Carbon $from, Carbon $to, ?int $propertyId): array
    {
        $transactions = Transaction::query()
            ->where('type', TransactionType::Expense->value)
            ->whereBetween('transaction_date', [$from->toDateString(), $to->toDateString()])
            ->when($propertyId !== null, fn (Builder $q) => $q->where('property_id', $propertyId))
            ->with(['property', 'category'])
            ->orderByDesc('transaction_date')
            ->get();

        $rows = $transactions->map(fn (Transaction $t): array => [
            'date' => $t->transaction_date->toDateString(),
            'property' => $t->property->name ?? '—',
            'category' => $t->category !== null ? $t->category->name : 'Uncategorized',
            'description' => $t->description ?: '—',
            'amount' => (string) $t->amount,
        ])->all();

        return [
            'columns' => [
                ['key' => 'date', 'label' => 'Date', 'type' => 'date'],
                ['key' => 'property', 'label' => 'Property', 'type' => 'text'],
                ['key' => 'category', 'label' => 'Category', 'type' => 'text'],
                ['key' => 'description', 'label' => 'Description', 'type' => 'text'],
                ['key' => 'amount', 'label' => 'Amount', 'type' => 'currency'],
            ],
            'rows' => $rows,
            'summary' => [
                ['label' => 'Total expenses', 'value' => (string) $transactions->sum('amount'), 'type' => 'currency'],
            ],
        ];
    }

    /**
     * @return array{columns: array<int, array{key: string, label: string, type: string}>, rows: array<int, array<string, string>>, summary: array<int, array{label: string, value: string, type: string}>}
     */
    private function profitLossReport(Carbon $from, Carbon $to, ?int $propertyId, ?int $unitId): array
    {
        $rentCollected = (string) $this->scopeByLease(
            Payment::query()
                ->where('status', PaymentStatus::Completed->value)
                ->whereBetween('payment_date', [$from->toDateString(), $to->toDateString()]),
            $propertyId,
            $unitId,
        )->sum('amount');

        $incomeRows = collect([['category' => 'Rent', 'amount' => $rentCollected]]);

        // Transactions are property-level, not unit-level — see incomeReport().
        if ($unitId === null) {
            $incomeRows = $incomeRows->concat($this->metrics->categoryBreakdown(TransactionType::Income, $propertyId, $from, $to));
        }

        $incomeRows = $incomeRows->map(fn (array $row): array => ['type' => 'Income', 'category' => $row['category'], 'amount' => $row['amount']]);

        $expenseRows = $unitId === null
            ? collect($this->metrics->categoryBreakdown(TransactionType::Expense, $propertyId, $from, $to))
                ->map(fn (array $row): array => ['type' => 'Expense', 'category' => $row['category'], 'amount' => $row['amount']])
            : collect();

        $totalIncome = $incomeRows->sum(fn (array $row) => (float) $row['amount']);
        $totalExpense = $expenseRows->sum(fn (array $row) => (float) $row['amount']);

        return [
            'columns' => [
                ['key' => 'type', 'label' => 'Type', 'type' => 'text'],
                ['key' => 'category', 'label' => 'Category', 'type' => 'text'],
                ['key' => 'amount', 'label' => 'Amount', 'type' => 'currency'],
            ],
            'rows' => $incomeRows->concat($expenseRows)->values()->all(),
            'summary' => [
                ['label' => 'Total income', 'value' => (string) $totalIncome, 'type' => 'currency'],
                ['label' => 'Total expenses', 'value' => (string) $totalExpense, 'type' => 'currency'],
                ['label' => 'Net profit', 'value' => (string) ($totalIncome - $totalExpense), 'type' => 'currency'],
            ],
        ];
    }

    /**
     * @return array{columns: array<int, array{key: string, label: string, type: string}>, rows: array<int, array<string, string>>, summary: null}
     */
    private function rentCollectionReport(Carbon $from, Carbon $to, ?int $propertyId, ?int $unitId): array
    {
        $rows = Property::query()
            ->when($propertyId !== null, fn (Builder $q) => $q->whereKey($propertyId))
            ->orderBy('name')->get()
            ->map(function (Property $property) use ($from, $to, $unitId): array {
                $billed = PaymentSchedule::query()
                    ->whereHas('lease.unit', fn (Builder $q) => $q->where('property_id', $property->id))
                    ->when($unitId !== null, fn (Builder $q) => $q->whereHas('lease', fn (Builder $q2) => $q2->where('unit_id', $unitId)))
                    ->whereBetween('period_start', [$from->toDateString(), $to->toDateString()])
                    ->sum('amount_expected');

                $collected = Payment::query()
                    ->where('status', PaymentStatus::Completed->value)
                    ->whereHas('lease.unit', fn (Builder $q) => $q->where('property_id', $property->id))
                    ->when($unitId !== null, fn (Builder $q) => $q->whereHas('lease', fn (Builder $q2) => $q2->where('unit_id', $unitId)))
                    ->whereBetween('payment_date', [$from->toDateString(), $to->toDateString()])
                    ->sum('amount');

                return [
                    'property' => $property->name,
                    'billed' => (string) $billed,
                    'collected' => (string) $collected,
                    'rate' => $billed > 0 ? round($collected / $billed * 100, 1).'%' : '—',
                ];
            })->all();

        return [
            'columns' => [
                ['key' => 'property', 'label' => 'Property', 'type' => 'text'],
                ['key' => 'billed', 'label' => 'Billed', 'type' => 'currency'],
                ['key' => 'collected', 'label' => 'Collected', 'type' => 'currency'],
                ['key' => 'rate', 'label' => 'Collection rate', 'type' => 'text'],
            ],
            'rows' => $rows,
            'summary' => null,
        ];
    }

    /**
     * @return array{columns: array<int, array{key: string, label: string, type: string}>, rows: array<int, array<string, string>>, summary: array<int, array{label: string, value: string, type: string}>}
     */
    private function rentArrearsReport(?int $propertyId, ?int $unitId): array
    {
        $today = Carbon::today();

        $schedules = $this->scopeByLease(PaymentSchedule::overdue(), $propertyId, $unitId)
            ->withSum(
                ['payments as paid_amount' => fn (Builder $q) => $q->where('status', PaymentStatus::Completed->value)],
                'amount',
            )
            ->with(['lease.unit.property', 'lease.tenants'])
            ->orderBy('period_start')
            ->get();

        $rows = $schedules->map(function (PaymentSchedule $schedule) use ($today): array {
            $balance = max(0.0, (float) $schedule->amount_expected - (float) ($schedule->paid_amount ?? 0));

            return [
                'tenant' => $this->tenantNames($schedule->lease?->tenants),
                'unit' => $schedule->lease?->unit->name ?? '—',
                'property' => $schedule->lease?->unit?->property->name ?? '—',
                'period' => "{$schedule->period_start->toDateString()} – {$schedule->period_end->toDateString()}",
                'amount_due' => (string) $balance,
                'days_overdue' => (string) $schedule->period_start->diffInDays($today),
                'status' => $schedule->status->label(),
            ];
        })->all();

        return [
            'columns' => [
                ['key' => 'tenant', 'label' => 'Tenant', 'type' => 'text'],
                ['key' => 'unit', 'label' => 'Unit', 'type' => 'text'],
                ['key' => 'property', 'label' => 'Property', 'type' => 'text'],
                ['key' => 'period', 'label' => 'Period', 'type' => 'text'],
                ['key' => 'amount_due', 'label' => 'Amount due', 'type' => 'currency'],
                ['key' => 'days_overdue', 'label' => 'Days overdue', 'type' => 'number'],
                ['key' => 'status', 'label' => 'Status', 'type' => 'text'],
            ],
            'rows' => $rows,
            'summary' => [
                ['label' => 'Total overdue', 'value' => (string) collect($rows)->sum(fn (array $row) => (float) $row['amount_due']), 'type' => 'currency'],
            ],
        ];
    }

    /**
     * @return array{columns: array<int, array{key: string, label: string, type: string}>, rows: array<int, array<string, string>>, summary: null}
     */
    private function advancePaymentsReport(?int $propertyId, ?int $unitId): array
    {
        $today = Carbon::today();

        $schedules = $this->scopeByLease(
            PaymentSchedule::query()
                ->where('status', PaymentScheduleStatus::Paid->value)
                ->where('period_start', '>', $today->toDateString()),
            $propertyId,
            $unitId,
        )
            ->with(['lease.unit.property', 'lease.tenants'])
            ->orderBy('period_start')
            ->get();

        $rows = $schedules->map(fn (PaymentSchedule $schedule): array => [
            'tenant' => $this->tenantNames($schedule->lease?->tenants),
            'unit' => $schedule->lease?->unit->name ?? '—',
            'property' => $schedule->lease?->unit?->property->name ?? '—',
            'period' => "{$schedule->period_start->toDateString()} – {$schedule->period_end->toDateString()}",
            'amount_paid' => (string) $schedule->amount_expected,
        ])->all();

        return [
            'columns' => [
                ['key' => 'tenant', 'label' => 'Tenant', 'type' => 'text'],
                ['key' => 'unit', 'label' => 'Unit', 'type' => 'text'],
                ['key' => 'property', 'label' => 'Property', 'type' => 'text'],
                ['key' => 'period', 'label' => 'Prepaid period', 'type' => 'text'],
                ['key' => 'amount_paid', 'label' => 'Amount', 'type' => 'currency'],
            ],
            'rows' => $rows,
            'summary' => null,
        ];
    }

    /**
     * @return array{columns: array<int, array{key: string, label: string, type: string}>, rows: array<int, array<string, string>>, summary: null}
     */
    private function tenantRosterReport(?int $propertyId, ?int $unitId): array
    {
        $activeLease = function ($q) use ($propertyId, $unitId) {
            $q->where('status', LeaseStatus::Active->value);

            if ($unitId !== null) {
                $q->where('unit_id', $unitId);
            } elseif ($propertyId !== null) {
                $q->whereHas('unit', fn (Builder $q2) => $q2->where('property_id', $propertyId));
            }
        };

        $tenants = Tenant::query()
            ->whereHas('leases', $activeLease)
            ->with(['leases' => function ($q) use ($activeLease) {
                $activeLease($q);
                $q->with('unit.property');
            }])
            ->orderBy('name')
            ->get();

        $rows = $tenants->map(function (Tenant $tenant): array {
            $lease = $tenant->leases->first();

            return [
                'tenant' => $tenant->name,
                'email' => $tenant->email ?? '—',
                'phone' => $tenant->phone ?? '—',
                'unit' => $lease?->unit->name ?? '—',
                'property' => $lease?->unit?->property->name ?? '—',
                'lease_status' => $lease !== null ? $lease->status->label() : '—',
            ];
        })->all();

        return [
            'columns' => [
                ['key' => 'tenant', 'label' => 'Tenant', 'type' => 'text'],
                ['key' => 'email', 'label' => 'Email', 'type' => 'text'],
                ['key' => 'phone', 'label' => 'Phone', 'type' => 'text'],
                ['key' => 'unit', 'label' => 'Unit', 'type' => 'text'],
                ['key' => 'property', 'label' => 'Property', 'type' => 'text'],
                ['key' => 'lease_status', 'label' => 'Lease status', 'type' => 'text'],
            ],
            'rows' => $rows,
            'summary' => null,
        ];
    }

    /**
     * @return array{columns: array<int, array{key: string, label: string, type: string}>, rows: array<int, array<string, string>>, summary: null}
     */
    private function newResidentsReport(Carbon $from, Carbon $to, ?int $propertyId, ?int $unitId): array
    {
        $leases = $this->scopeLeases(
            Lease::query()->whereBetween('start_date', [$from->toDateString(), $to->toDateString()]),
            $propertyId,
            $unitId,
        )
            ->with(['unit.property', 'tenants'])
            ->orderBy('start_date')
            ->get();

        $rows = $leases->map(fn (Lease $lease): array => [
            'tenant' => $this->tenantNames($lease->tenants),
            'unit' => $lease->unit->name ?? '—',
            'property' => $lease->unit?->property->name ?? '—',
            'move_in' => $lease->start_date->toDateString(),
            'rent' => (string) $lease->rent_amount,
        ])->all();

        return [
            'columns' => [
                ['key' => 'tenant', 'label' => 'Tenant', 'type' => 'text'],
                ['key' => 'unit', 'label' => 'Unit', 'type' => 'text'],
                ['key' => 'property', 'label' => 'Property', 'type' => 'text'],
                ['key' => 'move_in', 'label' => 'Move-in date', 'type' => 'date'],
                ['key' => 'rent', 'label' => 'Rent', 'type' => 'currency'],
            ],
            'rows' => $rows,
            'summary' => null,
        ];
    }

    /**
     * @return array{columns: array<int, array{key: string, label: string, type: string}>, rows: array<int, array<string, string>>, summary: null}
     */
    private function expiringLeasesReport(?int $propertyId, ?int $unitId): array
    {
        $today = Carbon::today();
        $horizon = $today->copy()->addDays(90);

        $leases = $this->scopeLeases(
            Lease::query()
                ->where('status', LeaseStatus::Active->value)
                ->whereBetween('end_date', [$today->toDateString(), $horizon->toDateString()]),
            $propertyId,
            $unitId,
        )
            ->with(['unit.property', 'tenants'])
            ->orderBy('end_date')
            ->get();

        $rows = $leases->map(fn (Lease $lease): array => [
            'tenant' => $this->tenantNames($lease->tenants),
            'unit' => $lease->unit->name ?? '—',
            'property' => $lease->unit?->property->name ?? '—',
            'end_date' => $lease->end_date->toDateString(),
            'days_remaining' => (string) $today->diffInDays($lease->end_date),
            'rent' => (string) $lease->rent_amount,
        ])->all();

        return [
            'columns' => [
                ['key' => 'tenant', 'label' => 'Tenant', 'type' => 'text'],
                ['key' => 'unit', 'label' => 'Unit', 'type' => 'text'],
                ['key' => 'property', 'label' => 'Property', 'type' => 'text'],
                ['key' => 'end_date', 'label' => 'End date', 'type' => 'date'],
                ['key' => 'days_remaining', 'label' => 'Days remaining', 'type' => 'number'],
                ['key' => 'rent', 'label' => 'Rent', 'type' => 'currency'],
            ],
            'rows' => $rows,
            'summary' => null,
        ];
    }

    /**
     * @return array{columns: array<int, array{key: string, label: string, type: string}>, rows: array<int, array<string, string>>, summary: null}
     */
    private function vacanciesReport(?int $propertyId, ?int $unitId): array
    {
        $units = Unit::query()
            ->where('status', UnitStatus::Vacant->value)
            ->when($unitId !== null, fn (Builder $q) => $q->whereKey($unitId))
            ->when($unitId === null && $propertyId !== null, fn (Builder $q) => $q->where('property_id', $propertyId))
            ->with(['property', 'unitType', 'currentPrice'])
            ->orderBy('name')
            ->get();

        $rows = $units->map(fn (Unit $unit): array => [
            'unit' => $unit->name,
            'property' => $unit->property->name ?? '—',
            'unit_type' => $unit->unitType->label ?? '—',
            'potential_rent' => $unit->currentPrice !== null ? (string) $unit->currentPrice->amount : '—',
        ])->all();

        return [
            'columns' => [
                ['key' => 'unit', 'label' => 'Unit', 'type' => 'text'],
                ['key' => 'property', 'label' => 'Property', 'type' => 'text'],
                ['key' => 'unit_type', 'label' => 'Unit type', 'type' => 'text'],
                ['key' => 'potential_rent', 'label' => 'Potential rent', 'type' => 'currency'],
            ],
            'rows' => $rows,
            'summary' => null,
        ];
    }

    /**
     * @return array{columns: array<int, array{key: string, label: string, type: string}>, rows: array<int, array<string, string>>, summary: array<int, array{label: string, value: string, type: string}>}
     */
    private function depositsReport(?int $propertyId, ?int $unitId): array
    {
        $leases = $this->scopeLeases(
            Lease::query()->where('status', LeaseStatus::Active->value),
            $propertyId,
            $unitId,
        )
            ->with(['unit.property', 'tenants'])
            ->orderBy('start_date')
            ->get();

        $rows = $leases->map(fn (Lease $lease): array => [
            'tenant' => $this->tenantNames($lease->tenants),
            'unit' => $lease->unit->name ?? '—',
            'property' => $lease->unit?->property->name ?? '—',
            'deposit' => $lease->security_deposit !== null ? (string) $lease->security_deposit : '0',
            'status' => $lease->security_deposit !== null ? 'Held' : 'None',
        ])->all();

        return [
            'columns' => [
                ['key' => 'tenant', 'label' => 'Tenant', 'type' => 'text'],
                ['key' => 'unit', 'label' => 'Unit', 'type' => 'text'],
                ['key' => 'property', 'label' => 'Property', 'type' => 'text'],
                ['key' => 'deposit', 'label' => 'Deposit', 'type' => 'currency'],
                ['key' => 'status', 'label' => 'Status', 'type' => 'text'],
            ],
            'rows' => $rows,
            'summary' => [
                ['label' => 'Total held', 'value' => (string) $leases->sum('security_deposit'), 'type' => 'currency'],
            ],
        ];
    }

    /**
     * @param  Collection<int, Tenant>|null  $tenants
     */
    private function tenantNames(?Collection $tenants): string
    {
        if ($tenants === null || $tenants->isEmpty()) {
            return '—';
        }

        return $tenants->pluck('name')->join(', ');
    }
}
