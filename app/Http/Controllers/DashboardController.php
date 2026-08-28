<?php

namespace App\Http\Controllers;

use App\Enums\LeaseStatus;
use App\Enums\MaintenancePriority;
use App\Enums\MaintenanceStatus;
use App\Enums\PaymentStatus;
use App\Enums\TransactionType;
use App\Enums\UnitStatus;
use App\Models\Lease;
use App\Models\MaintenanceRequest;
use App\Models\Payment;
use App\Models\PaymentSchedule;
use App\Models\Property;
use App\Models\Transaction;
use App\Models\Unit;
use App\Models\User;
use App\Services\PortfolioMetrics;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Activitylog\Models\Activity;

class DashboardController extends Controller
{
    private const UPCOMING_RENEWAL_DAYS = 30;

    private const ACTIVITY_LIMIT = 8;

    private const OPEN_MAINTENANCE_LIMIT = 5;

    private const RENEWALS_LIMIT = 8;

    private const EXPIRING_LEASE_DAYS = 90;

    private const NEEDS_ATTENTION_LIMIT = 5;

    private const COLLECTION_RATE_MONTHS = 6;

    public function __construct(private readonly PortfolioMetrics $metrics) {}

    public function show(Request $request): Response
    {
        $monthStart = Carbon::now()->startOfMonth();
        $now = Carbon::now();
        $propertyId = $request->integer('property_id') ?: null;

        // The portfolio-wide widgets below always use null regardless of the
        // filter; when no property is selected the new Insights trend wants
        // that exact same series, so reuse it instead of computing it twice.
        $monthlyTrendAll = $this->metrics->monthlyTrend(null);

        return Inertia::render('dashboard', [
            'kpis' => [
                ...$this->occupancyKpis(),
                ...$this->rentCollectedKpis(),
                ...$this->overdueKpis(),
                ...$this->maintenanceKpis(),
            ],
            'monthly_trend' => $monthlyTrendAll,
            'expense_by_category' => $this->metrics->categoryBreakdown(TransactionType::Expense, null, $monthStart, $now),
            'income_by_category' => $this->metrics->categoryBreakdown(TransactionType::Income, null, $monthStart, $now),
            'lease_status_distribution' => $this->metrics->leaseStatusDistribution(null),
            'upcoming_renewals' => $this->upcomingRenewals(),
            'activity' => $this->recentActivity(),
            'open_maintenance' => $this->openMaintenance(),

            // Overview section — property-filterable, unlike the
            // portfolio-wide widgets above.
            'overview_filters' => [
                'property_id' => $propertyId !== null ? (string) $propertyId : null,
            ],
            // Closure: skipped on a partial reload that excludes it — the
            // property filter's own selection changes never change the
            // option list itself, so there's no reason to resend/requery it.
            'properties' => fn () => $this->propertyOptions(),
            'overview' => $this->overviewKpis($propertyId),
            'collection_rate_trend' => $this->collectionRateTrend($propertyId),
            'income_vs_expenses_recent' => $propertyId === null
                ? $monthlyTrendAll
                : $this->metrics->monthlyTrend($propertyId),
            'expenses_by_category_recent' => $this->metrics->categoryBreakdown(
                TransactionType::Expense,
                $propertyId,
                Carbon::now()->subMonthsNoOverflow(2)->startOfMonth(),
                $now,
            ),
            'by_property' => $this->byPropertyRows($propertyId),
            'needs_attention' => [
                'overdue_tenants' => $this->overdueTenantsList($propertyId),
                'expiring_leases' => $this->expiringLeasesList($propertyId),
                'vacant_units' => $this->vacantUnitsList($propertyId),
            ],
        ]);
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
     * @return array{year: int, net_profit: string, income: string, expenses: string}
     */
    private function overviewKpis(?int $propertyId): array
    {
        $yearStart = Carbon::now()->startOfYear();
        $now = Carbon::now();

        $rentCollected = (float) $this->scopeByProperty(
            Payment::query()
                ->where('status', PaymentStatus::Completed->value)
                ->whereBetween('payment_date', [$yearStart->toDateString(), $now->toDateString()]),
            $propertyId,
        )->sum('amount');

        $otherIncome = collect($this->metrics->categoryBreakdown(TransactionType::Income, $propertyId, $yearStart, $now))
            ->sum(fn (array $row) => (float) $row['amount']);

        $expenses = collect($this->metrics->categoryBreakdown(TransactionType::Expense, $propertyId, $yearStart, $now))
            ->sum(fn (array $row) => (float) $row['amount']);

        $income = $rentCollected + $otherIncome;

        return [
            'year' => $yearStart->year,
            'net_profit' => (string) ($income - $expenses),
            'income' => (string) $income,
            'expenses' => (string) $expenses,
        ];
    }

    /**
     * Trailing months' billed-vs-collected rate — a property-filterable
     * sibling to the portfolio-wide rentCollectionReport() on the Reports
     * page, but shaped as a short trend rather than a per-property table row.
     *
     * @return array<int, array{month: string, full_month: string, rate: float}>
     */
    private function collectionRateTrend(?int $propertyId): array
    {
        $months = collect(range(self::COLLECTION_RATE_MONTHS - 1, 0))
            ->map(fn (int $i) => Carbon::now()->subMonthsNoOverflow($i)->startOfMonth());

        return $months->map(function (Carbon $month) use ($propertyId) {
            $monthEnd = $month->copy()->endOfMonth();

            $billedQuery = PaymentSchedule::query()
                ->whereBetween('period_start', [$month->toDateString(), $monthEnd->toDateString()]);

            if ($propertyId !== null) {
                $billedQuery->whereHas('lease.unit', fn (Builder $q) => $q->where('property_id', $propertyId));
            }

            $collectedQuery = $this->scopeByProperty(
                Payment::query()
                    ->where('status', PaymentStatus::Completed->value)
                    ->whereBetween('payment_date', [$month->toDateString(), $monthEnd->toDateString()]),
                $propertyId,
            );

            $billed = (float) $billedQuery->sum('amount_expected');
            $collected = (float) $collectedQuery->sum('amount');

            return [
                'month' => $month->format('M'),
                'full_month' => $month->format('M Y'),
                'rate' => $billed > 0 ? round($collected / $billed * 100, 1) : 0.0,
            ];
        })->values()->all();
    }

    /**
     * @return array<int, array{id: int, name: string, occupancy_rate: float, income: string, overdue: string}>
     */
    private function byPropertyRows(?int $propertyId): array
    {
        $yearStart = Carbon::now()->startOfYear();
        $now = Carbon::now();

        // One grouped query for unit occupancy counts, rather than two
        // Unit::count() queries per property (avoids an N+1 across the portfolio).
        $unitCounts = Unit::query()->toBase()
            ->selectRaw('property_id, status, count(*) as count')
            ->groupBy('property_id', 'status')
            ->get()
            ->groupBy('property_id');

        // One grouped query for overdue balances, rather than one per property.
        $overdueByProperty = PaymentSchedule::overdue()
            ->withSum(
                ['payments as paid_amount' => fn (Builder $q) => $q->where('status', PaymentStatus::Completed->value)],
                'amount',
            )
            ->with('lease.unit')
            ->get()
            ->groupBy(fn (PaymentSchedule $schedule) => $schedule->lease?->unit?->property_id)
            ->map(fn ($group) => $group->sum(
                fn (PaymentSchedule $schedule) => max(0.0, (float) $schedule->amount_expected - (float) ($schedule->paid_amount ?? 0)),
            ));

        // Two grouped queries (rent + other income), rather than two per
        // property — this portfolio can have hundreds of properties, so a
        // per-property Payment::sum()/categoryBreakdown() pair here would be
        // an N+1 that turns this page into a multi-second (or worse) load.
        $rentByProperty = Payment::query()
            ->join('leases', 'leases.id', '=', 'payments.lease_id')
            ->join('units', 'units.id', '=', 'leases.unit_id')
            ->where('payments.status', PaymentStatus::Completed->value)
            ->whereBetween('payments.payment_date', [$yearStart->toDateString(), $now->toDateString()])
            ->selectRaw('units.property_id as property_id, sum(payments.amount) as total')
            ->groupBy('units.property_id')
            ->pluck('total', 'property_id');

        $otherIncomeByProperty = Transaction::query()
            ->where('type', TransactionType::Income->value)
            ->whereBetween('transaction_date', [$yearStart->toDateString(), $now->toDateString()])
            ->selectRaw('property_id, sum(amount) as total')
            ->groupBy('property_id')
            ->pluck('total', 'property_id');

        return Property::query()
            ->when($propertyId !== null, fn (Builder $q) => $q->whereKey($propertyId))
            ->orderBy('name')
            ->get()
            ->map(function (Property $property) use ($unitCounts, $overdueByProperty, $rentByProperty, $otherIncomeByProperty): array {
                $counts = $unitCounts->get($property->id, collect());
                $total = (int) $counts->sum('count');
                $occupied = (int) ($counts->firstWhere('status', UnitStatus::Occupied->value)->count ?? 0);

                $income = (float) ($rentByProperty->get($property->id) ?? 0)
                    + (float) ($otherIncomeByProperty->get($property->id) ?? 0);

                return [
                    'id' => $property->id,
                    'name' => $property->name,
                    'occupancy_rate' => $total > 0 ? round($occupied / $total * 100, 1) : 0.0,
                    'income' => (string) $income,
                    'overdue' => (string) ((float) ($overdueByProperty->get($property->id) ?? 0)),
                ];
            })
            ->all();
    }

    /**
     * @return array<int, array{id: int, name: string, property_name: string|null, unit_name: string|null, overdue: string}>
     */
    private function overdueTenantsList(?int $propertyId): array
    {
        $query = PaymentSchedule::overdue()
            ->withSum(
                ['payments as paid_amount' => fn (Builder $q) => $q->where('status', PaymentStatus::Completed->value)],
                'amount',
            )
            ->with(['lease.unit.property', 'lease.tenants']);

        if ($propertyId !== null) {
            $query->whereHas('lease.unit', fn (Builder $q) => $q->where('property_id', $propertyId));
        }

        /** @var array<int, array{id: int, name: string, property_name: string|null, unit_name: string|null, overdue: float}> $byTenant */
        $byTenant = [];

        foreach ($query->get() as $schedule) {
            $balance = max(0.0, (float) $schedule->amount_expected - (float) ($schedule->paid_amount ?? 0));

            foreach ($schedule->lease?->tenants ?? [] as $tenant) {
                $byTenant[$tenant->id] ??= [
                    'id' => $tenant->id,
                    'name' => $tenant->name,
                    'property_name' => $schedule->lease?->unit?->property?->name,
                    'unit_name' => $schedule->lease?->unit?->name,
                    'overdue' => 0.0,
                ];
                $byTenant[$tenant->id]['overdue'] += $balance;
            }
        }

        return collect($byTenant)
            ->sortByDesc('overdue')
            ->take(self::NEEDS_ATTENTION_LIMIT)
            ->values()
            ->map(fn (array $row): array => [...$row, 'overdue' => (string) $row['overdue']])
            ->all();
    }

    /**
     * @return array<int, array{id: int, unit_name: string|null, property_name: string|null, tenant_names: array<int, string>, end_date: string, days_remaining: int}>
     */
    private function expiringLeasesList(?int $propertyId): array
    {
        $today = Carbon::today();
        $horizon = $today->copy()->addDays(self::EXPIRING_LEASE_DAYS);

        $query = Lease::query()
            ->where('status', LeaseStatus::Active->value)
            ->whereBetween('end_date', [$today->toDateString(), $horizon->toDateString()])
            ->with(['unit.property', 'tenants']);

        if ($propertyId !== null) {
            $query->whereHas('unit', fn (Builder $q) => $q->where('property_id', $propertyId));
        }

        return $query->orderBy('end_date')
            ->limit(self::NEEDS_ATTENTION_LIMIT)
            ->get()
            ->map(fn (Lease $lease): array => [
                'id' => $lease->id,
                'unit_name' => $lease->unit?->name,
                'property_name' => $lease->unit?->property?->name,
                'tenant_names' => $lease->tenants->pluck('name')->all(),
                'end_date' => $lease->end_date->toDateString(),
                'days_remaining' => $today->diffInDays($lease->end_date),
            ])
            ->all();
    }

    /**
     * @return array<int, array{id: int, property_id: int, name: string, property_name: string|null, vacancy_label: string, potential_rent: string|null}>
     */
    private function vacantUnitsList(?int $propertyId): array
    {
        $query = Unit::query()
            ->where('status', UnitStatus::Vacant->value)
            ->with(['property', 'currentPrice', 'leases']);

        if ($propertyId !== null) {
            $query->where('property_id', $propertyId);
        }

        return $query->orderBy('name')
            ->limit(self::NEEDS_ATTENTION_LIMIT)
            ->get()
            ->map(function (Unit $unit): array {
                // A unit's own history is the only source of "since when" —
                // no separate vacated_at column exists, so the most recent
                // lease's end date (if any) stands in for it.
                $lastLease = $unit->leases->sortByDesc('end_date')->first();

                return [
                    'id' => $unit->id,
                    'property_id' => $unit->property_id,
                    'name' => $unit->name,
                    'property_name' => $unit->property?->name,
                    'vacancy_label' => $lastLease === null
                        ? 'Never occupied'
                        : 'Vacant since '.$lastLease->end_date->toDateString(),
                    'potential_rent' => $unit->currentPrice !== null ? (string) $unit->currentPrice->amount : null,
                ];
            })
            ->all();
    }

    /**
     * @template TModel of Model
     *
     * @param  Builder<TModel>  $query
     * @return Builder<TModel>
     */
    private function scopeByProperty(Builder $query, ?int $propertyId): Builder
    {
        if ($propertyId !== null) {
            $query->whereHas('lease.unit', fn (Builder $q) => $q->where('property_id', $propertyId));
        }

        return $query;
    }

    /**
     * @return array{occupied_units: int, total_units: int, vacant_units: int, occupancy_rate: float}
     */
    private function occupancyKpis(): array
    {
        $totalUnits = Unit::count();
        $occupiedUnits = Unit::where('status', UnitStatus::Occupied->value)->count();

        return [
            'occupied_units' => $occupiedUnits,
            'total_units' => $totalUnits,
            'vacant_units' => $totalUnits - $occupiedUnits,
            'occupancy_rate' => $totalUnits > 0 ? round($occupiedUnits / $totalUnits * 100, 1) : 0.0,
        ];
    }

    /**
     * @return array{rent_collected_mtd: string, rent_collected_change_pct: float|null}
     */
    private function rentCollectedKpis(): array
    {
        $now = Carbon::now();
        $mtdStart = $now->copy()->startOfMonth();

        $rentMtd = Payment::query()
            ->where('status', PaymentStatus::Completed->value)
            ->whereBetween('payment_date', [$mtdStart->toDateString(), $now->toDateString()])
            ->sum('amount');

        // Compared to the same number of days into last month, not all of
        // last month — otherwise this always reads as a drop until the
        // month is over.
        $comparableLastMonthStart = $now->copy()->subMonthNoOverflow()->startOfMonth();
        $comparableLastMonthEnd = $now->copy()->subMonthNoOverflow();

        $rentComparableLastMonth = Payment::query()
            ->where('status', PaymentStatus::Completed->value)
            ->whereBetween('payment_date', [$comparableLastMonthStart->toDateString(), $comparableLastMonthEnd->toDateString()])
            ->sum('amount');

        return [
            'rent_collected_mtd' => (string) $rentMtd,
            'rent_collected_change_pct' => $rentComparableLastMonth > 0
                ? round((($rentMtd - $rentComparableLastMonth) / $rentComparableLastMonth) * 100, 1)
                : null,
        ];
    }

    /**
     * @return array{overdue_balance: string, overdue_leases_count: int, overdue_tenants_count: int}
     */
    private function overdueKpis(): array
    {
        $overdueSchedules = PaymentSchedule::overdue()
            ->withSum(
                ['payments as paid_amount' => fn ($q) => $q->where('status', PaymentStatus::Completed->value)],
                'amount',
            )
            ->with('lease.tenants')
            ->get();

        $overdueBalance = $overdueSchedules->sum(
            fn (PaymentSchedule $schedule) => max(0.0, (float) $schedule->amount_expected - (float) ($schedule->paid_amount ?? 0)),
        );

        $tenantIds = $overdueSchedules
            ->pluck('lease.tenants')
            ->filter()
            ->flatten()
            ->pluck('id')
            ->unique();

        return [
            'overdue_balance' => (string) $overdueBalance,
            'overdue_leases_count' => $overdueSchedules->pluck('lease_id')->unique()->count(),
            'overdue_tenants_count' => $tenantIds->count(),
        ];
    }

    /**
     * @return array{maintenance_open_count: int, maintenance_urgent_count: int, maintenance_in_progress_count: int}
     */
    private function maintenanceKpis(): array
    {
        $openStatuses = [MaintenanceStatus::Open->value, MaintenanceStatus::InProgress->value];

        return [
            'maintenance_open_count' => MaintenanceRequest::whereIn('status', $openStatuses)->count(),
            'maintenance_urgent_count' => MaintenanceRequest::whereIn('status', $openStatuses)
                ->where('priority', MaintenancePriority::Urgent->value)->count(),
            'maintenance_in_progress_count' => MaintenanceRequest::where('status', MaintenanceStatus::InProgress->value)->count(),
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function upcomingRenewals(): array
    {
        $today = Carbon::today();

        return Lease::query()
            ->where('status', LeaseStatus::Active->value)
            ->whereBetween('end_date', [$today->toDateString(), $today->copy()->addDays(self::UPCOMING_RENEWAL_DAYS)->toDateString()])
            ->with(['unit.property', 'tenants'])
            ->orderBy('end_date')
            ->limit(self::RENEWALS_LIMIT)
            ->get()
            ->map(fn (Lease $lease): array => [
                'id' => $lease->id,
                'unit_name' => $lease->unit?->name,
                'property_name' => $lease->unit?->property?->name,
                'tenant_names' => $lease->tenants->pluck('name')->all(),
                'end_date' => $lease->end_date->toDateString(),
                'rent_amount' => (string) $lease->rent_amount,
                'billing_period_label' => $lease->billing_period->label(),
            ])
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function recentActivity(): array
    {
        return Activity::query()
            ->with('causer')
            ->latest()
            ->limit(self::ACTIVITY_LIMIT)
            ->get()
            ->map(fn (Activity $activity): array => [
                'id' => $activity->id,
                'description' => $activity->description,
                'log_name' => $activity->log_name,
                'event' => $activity->event,
                'causer_name' => $activity->causer instanceof User ? $activity->causer->name : null,
                'created_at' => $activity->created_at?->toIso8601String(),
            ])
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function openMaintenance(): array
    {
        $priorityRank = [
            MaintenancePriority::Urgent->value => 0,
            MaintenancePriority::High->value => 1,
            MaintenancePriority::Medium->value => 2,
            MaintenancePriority::Low->value => 3,
        ];

        return MaintenanceRequest::query()
            ->whereIn('status', [MaintenanceStatus::Open->value, MaintenanceStatus::InProgress->value])
            ->with('unit.property')
            ->orderByDesc('created_at')
            ->get()
            ->sortBy(fn (MaintenanceRequest $request) => $priorityRank[$request->priority->value])
            ->take(self::OPEN_MAINTENANCE_LIMIT)
            ->values()
            ->map(fn (MaintenanceRequest $request): array => [
                'id' => $request->id,
                'title' => $request->title,
                'unit_name' => $request->unit?->name,
                'property_name' => $request->unit?->property?->name,
                'priority' => $request->priority->value,
                'priority_label' => $request->priority->label(),
                'status' => $request->status->value,
                'status_label' => $request->status->label(),
            ])
            ->all();
    }
}
