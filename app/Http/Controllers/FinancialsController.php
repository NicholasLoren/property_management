<?php

namespace App\Http\Controllers;

use App\Enums\BillingPeriod;
use App\Enums\LeaseStatus;
use App\Enums\MaintenanceStatus;
use App\Enums\PaymentStatus;
use App\Enums\TransactionType;
use App\Enums\UnitStatus;
use App\Exports\ReportExport;
use App\Models\Lease;
use App\Models\MaintenanceRequest;
use App\Models\Payment;
use App\Models\Property;
use App\Models\Transaction;
use App\Models\Unit;
use App\Services\PortfolioMetrics;
use App\Settings\BrandingSettings;
use App\Support\Branding;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

class FinancialsController extends Controller
{
    public function __construct(private readonly PortfolioMetrics $metrics) {}

    public function index(Request $request): Response
    {
        [$from, $to, $propertyId] = $this->parseFilters($request);

        $properties = $propertyId !== null
            ? Property::query()->whereKey($propertyId)->get()
            : Property::query()->orderBy('name')->get();

        $rows = $properties->map(fn (Property $property) => $this->propertyRow($property, $from, $to))->values();

        return Inertia::render('financials/index', [
            'filters' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
                'property_id' => $propertyId !== null ? (string) $propertyId : null,
            ],
            'properties' => Property::query()->orderBy('name')->get()
                ->map(fn (Property $p) => ['value' => (string) $p->id, 'label' => $p->name])->all(),
            'summary' => [
                'rent_collected' => (string) $rows->sum('rent_collected_raw'),
                'other_income' => (string) $rows->sum('other_income_raw'),
                'total_expense' => (string) $rows->sum('total_expense_raw'),
                'net_income' => (string) $rows->sum('net_income_raw'),
                'total_units' => $rows->sum('total_units'),
                'occupied_units' => $rows->sum('occupied_units'),
                'occupancy_rate' => $rows->sum('total_units') > 0
                    ? round($rows->sum('occupied_units') / $rows->sum('total_units') * 100, 1)
                    : 0,
                'expected_monthly_rent' => (string) $this->expectedMonthlyRent($propertyId),
                'maintenance_open' => $rows->sum('maintenance_open'),
                'maintenance_completed_cost' => (string) $rows->sum('maintenance_completed_cost_raw'),
            ],
            'properties_breakdown' => $rows->map(fn (array $row) => [
                'property_id' => $row['property_id'],
                'property_name' => $row['property_name'],
                'rent_collected' => $row['rent_collected'],
                'other_income' => $row['other_income'],
                'total_expense' => $row['total_expense'],
                'net_income' => $row['net_income'],
                'occupancy_rate' => $row['occupancy_rate'],
                'maintenance_open' => $row['maintenance_open'],
            ])->all(),
            'monthly_trend' => $this->metrics->monthlyTrend($propertyId),
            'expense_by_category' => $this->metrics->categoryBreakdown(TransactionType::Expense, $propertyId, $from, $to),
            'income_by_category' => $this->metrics->categoryBreakdown(TransactionType::Income, $propertyId, $from, $to),
            'lease_status_distribution' => $this->metrics->leaseStatusDistribution($propertyId),
        ]);
    }

    public function export(Request $request, string $format, BrandingSettings $branding): HttpResponse
    {
        [$from, $to, $propertyId] = $this->parseFilters($request);

        $properties = $propertyId !== null
            ? Property::query()->whereKey($propertyId)->get()
            : Property::query()->orderBy('name')->get();

        $headings = ['Property', 'Rent collected', 'Other income', 'Expenses', 'Net income', 'Occupancy'];
        $rows = $properties->map(function (Property $property) use ($from, $to) {
            $row = $this->propertyRow($property, $from, $to);

            return [
                $row['property_name'],
                $row['rent_collected'],
                $row['other_income'],
                $row['total_expense'],
                $row['net_income'],
                "{$row['occupancy_rate']}%",
            ];
        })->all();

        $export = new ReportExport($rows, $headings);
        $title = "Financial report ({$from->toDateString()} to {$to->toDateString()})";

        return $format === 'excel'
            ? $export->download('financials.xlsx')
            : Pdf::loadView('exports.pdf-table', [
                'title' => $title,
                'headings' => $headings,
                'rows' => $rows,
                'headerText' => $branding->pdf_header_text,
                'accentColor' => $branding->accent_color,
                'logoDataUri' => Branding::logoDataUri(),
            ])->download('financials.pdf');
    }

    /**
     * @return array{0: Carbon, 1: Carbon, 2: int|null}
     */
    private function parseFilters(Request $request): array
    {
        $from = $request->string('from')->value();
        $to = $request->string('to')->value();
        $propertyId = $request->integer('property_id') ?: null;

        return [
            $from !== '' ? Carbon::parse($from)->startOfDay() : Carbon::now()->startOfMonth(),
            $to !== '' ? Carbon::parse($to)->endOfDay() : Carbon::now()->endOfDay(),
            $propertyId,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function propertyRow(Property $property, Carbon $from, Carbon $to): array
    {
        $rentCollected = Payment::query()
            ->whereHas('lease.unit', fn ($q) => $q->where('property_id', $property->id))
            ->where('status', PaymentStatus::Completed->value)
            ->whereBetween('payment_date', [$from->toDateString(), $to->toDateString()])
            ->sum('amount');

        $otherIncome = Transaction::query()
            ->where('property_id', $property->id)
            ->where('type', TransactionType::Income->value)
            ->whereBetween('transaction_date', [$from->toDateString(), $to->toDateString()])
            ->sum('amount');

        $totalExpense = Transaction::query()
            ->where('property_id', $property->id)
            ->where('type', TransactionType::Expense->value)
            ->whereBetween('transaction_date', [$from->toDateString(), $to->toDateString()])
            ->sum('amount');

        $totalUnits = Unit::query()->where('property_id', $property->id)->count();
        $occupiedUnits = Unit::query()->where('property_id', $property->id)
            ->where('status', UnitStatus::Occupied->value)->count();

        $maintenanceOpen = MaintenanceRequest::query()
            ->whereHas('unit', fn ($q) => $q->where('property_id', $property->id))
            ->whereIn('status', [MaintenanceStatus::Open->value, MaintenanceStatus::InProgress->value])
            ->count();

        $maintenanceCompletedCost = MaintenanceRequest::query()
            ->whereHas('unit', fn ($q) => $q->where('property_id', $property->id))
            ->where('status', MaintenanceStatus::Completed->value)
            ->whereBetween('completed_at', [$from, $to])
            ->sum('cost');

        $netIncome = ($rentCollected + $otherIncome) - $totalExpense;

        return [
            'property_id' => $property->id,
            'property_name' => $property->name,
            'rent_collected' => (string) $rentCollected,
            'rent_collected_raw' => $rentCollected,
            'other_income' => (string) $otherIncome,
            'other_income_raw' => $otherIncome,
            'total_expense' => (string) $totalExpense,
            'total_expense_raw' => $totalExpense,
            'net_income' => (string) $netIncome,
            'net_income_raw' => $netIncome,
            'total_units' => $totalUnits,
            'occupied_units' => $occupiedUnits,
            'occupancy_rate' => $totalUnits > 0 ? round($occupiedUnits / $totalUnits * 100, 1) : 0,
            'maintenance_open' => $maintenanceOpen,
            'maintenance_completed_cost_raw' => $maintenanceCompletedCost,
        ];
    }

    private function expectedMonthlyRent(?int $propertyId): string
    {
        $query = Lease::query()
            ->where('status', LeaseStatus::Active->value)
            ->where('billing_period', BillingPeriod::Monthly->value);

        if ($propertyId !== null) {
            $query->whereHas('unit', fn ($q) => $q->where('property_id', $propertyId));
        }

        return (string) $query->sum('rent_amount');
    }
}
