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
use App\Models\Unit;
use App\Models\User;
use App\Services\PortfolioMetrics;
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

    public function __construct(private readonly PortfolioMetrics $metrics) {}

    public function show(): Response
    {
        $monthStart = Carbon::now()->startOfMonth();
        $now = Carbon::now();

        return Inertia::render('dashboard', [
            'kpis' => [
                ...$this->occupancyKpis(),
                ...$this->rentCollectedKpis(),
                ...$this->overdueKpis(),
                ...$this->maintenanceKpis(),
            ],
            'monthly_trend' => $this->metrics->monthlyTrend(null),
            'expense_by_category' => $this->metrics->categoryBreakdown(TransactionType::Expense, null, $monthStart, $now),
            'income_by_category' => $this->metrics->categoryBreakdown(TransactionType::Income, null, $monthStart, $now),
            'lease_status_distribution' => $this->metrics->leaseStatusDistribution(null),
            'upcoming_renewals' => $this->upcomingRenewals(),
            'activity' => $this->recentActivity(),
            'open_maintenance' => $this->openMaintenance(),
        ]);
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
