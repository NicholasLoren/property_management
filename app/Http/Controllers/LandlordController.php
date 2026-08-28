<?php

namespace App\Http\Controllers;

use App\Enums\LeaseStatus;
use App\Enums\PaymentStatus;
use App\Enums\TransactionType;
use App\Enums\UnitStatus;
use App\Models\Document;
use App\Models\Lease;
use App\Models\MaintenanceRequest;
use App\Models\Payment;
use App\Models\PaymentSchedule;
use App\Models\Property;
use App\Models\Tenant;
use App\Models\Transaction;
use App\Models\Unit;
use App\Models\User;
use App\Settings\ComplianceSettings;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LandlordController extends Controller
{
    private const TABS = ['properties', 'units', 'tenants', 'payments', 'maintenance', 'documents'];

    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->value();
        $dir = $request->string('dir', 'asc')->value() === 'desc' ? 'desc' : 'asc';
        $perPage = (int) $request->integer('per_page', 10);
        $perPage = in_array($perPage, [10, 25, 50], true) ? $perPage : 10;

        $query = User::role('Landlord')->withCount('properties');

        if ($search !== '') {
            $query->where(fn (Builder $q) => $q->where('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%"));
        }

        $query->orderBy('name', $dir)->orderBy('id');

        $paginator = $query->paginate($perPage)->withQueryString();

        return Inertia::render('landlords/index', [
            'landlords' => [
                'data' => $paginator->getCollection()->map(fn (User $landlord) => [
                    'id' => $landlord->id,
                    'name' => $landlord->name,
                    'email' => $landlord->email,
                    'properties_count' => $landlord->properties_count,
                ])->all(),
                'meta' => $this->paginationMeta($paginator),
            ],
            'filters' => [
                'search' => $search,
                'dir' => $dir,
                'per_page' => $perPage,
            ],
        ]);
    }

    public function show(Request $request, User $landlord, ComplianceSettings $compliance): Response
    {
        abort_unless($landlord->hasRole('Landlord'), 404);

        $landlord->load(['landlordDetail.media']);

        $tab = $request->string('tab', 'properties')->value();
        $tab = in_array($tab, self::TABS, true) ? $tab : 'properties';

        $sort = $request->string('sort')->value();
        $dir = $request->string('dir', 'asc')->value() === 'desc' ? 'desc' : 'asc';
        $perPage = (int) $request->integer('per_page', 10);
        $perPage = in_array($perPage, [10, 25, 50], true) ? $perPage : 10;
        $page = max(1, (int) $request->integer('page', 1));

        $propertyIds = $landlord->properties()->pluck('id')->all();
        $unitIds = Unit::query()->whereIn('property_id', $propertyIds)->pluck('id')->all();

        $fetchProperties = fn () => $this->paginatedLandlordPropertiesTable($landlord, $sort, $dir, $perPage, $page);
        $fetchUnits = fn () => $this->paginatedLandlordUnitsTable($propertyIds, $sort, $dir, $perPage, $page);
        $fetchTenants = fn () => $this->paginatedLandlordTenantsTable($unitIds, $sort, $dir, $perPage, $page);
        $fetchPayments = fn () => $this->paginatedLandlordPaymentsTable($propertyIds, $sort, $dir, $perPage, $page);
        $fetchMaintenance = fn () => $this->paginatedLandlordMaintenanceTable($propertyIds, $sort, $dir, $perPage, $page);
        $fetchDocuments = fn () => $this->paginatedLandlordDocumentsTable($propertyIds, $sort, $dir, $perPage, $page);

        return Inertia::render('landlords/show', [
            'landlord' => $this->transformForShow($landlord, $propertyIds, $unitIds),
            'compliance_enabled' => $compliance->enabled,
            'tableFilters' => [
                'tab' => $tab,
                'sort' => $sort,
                'dir' => $dir,
                'per_page' => $perPage,
                'page' => $page,
            ],
            // Deferred (auto-fetched right after mount) for whichever tab is
            // currently shown; the others stay optional until the frontend
            // requests them by switching tabs — same pattern as the lease
            // and property show pages' own paginated tabs.
            'propertiesTable' => $tab === 'properties' ? Inertia::defer($fetchProperties) : Inertia::optional($fetchProperties),
            'unitsTable' => $tab === 'units' ? Inertia::defer($fetchUnits) : Inertia::optional($fetchUnits),
            'tenantsTable' => $tab === 'tenants' ? Inertia::defer($fetchTenants) : Inertia::optional($fetchTenants),
            'paymentsTable' => $tab === 'payments' ? Inertia::defer($fetchPayments) : Inertia::optional($fetchPayments),
            'maintenanceTable' => $tab === 'maintenance' ? Inertia::defer($fetchMaintenance) : Inertia::optional($fetchMaintenance),
            'documentsTable' => $tab === 'documents' ? Inertia::defer($fetchDocuments) : Inertia::optional($fetchDocuments),
        ]);
    }

    /**
     * @param  array<int, int>  $propertyIds
     * @param  array<int, int>  $unitIds
     * @return array<string, mixed>
     */
    private function transformForShow(User $landlord, array $propertyIds, array $unitIds): array
    {
        $landlordDetail = $landlord->landlordDetail;
        $document = $landlordDetail?->getFirstMedia('id_document');

        $totalIncome = (string) Transaction::whereIn('property_id', $propertyIds)->where('type', TransactionType::Income->value)->sum('amount');
        $totalExpenses = (string) Transaction::whereIn('property_id', $propertyIds)->where('type', TransactionType::Expense->value)->sum('amount');

        $unitsTotal = count($unitIds);
        $occupiedCount = Unit::whereIn('id', $unitIds)->where('status', UnitStatus::Occupied->value)->count();

        $activeLeaseIds = Lease::query()
            ->whereIn('unit_id', $unitIds)
            ->where('status', LeaseStatus::Active->value)
            ->pluck('id');

        $thisMonthSchedules = PaymentSchedule::query()
            ->whereIn('lease_id', $activeLeaseIds)
            ->whereBetween('period_start', [now()->startOfMonth()->toDateString(), now()->endOfMonth()->toDateString()])
            ->withSum(['payments as paid_amount' => fn (Builder $q) => $q->where('status', PaymentStatus::Completed->value)], 'amount')
            ->get();

        $dueThisMonth = $thisMonthSchedules->sum(fn (PaymentSchedule $schedule) => (float) $schedule->amount_expected);
        $collectedThisMonth = $thisMonthSchedules->sum(fn (PaymentSchedule $schedule) => (float) ($schedule->paid_amount ?? 0));

        return [
            'id' => $landlord->id,
            'name' => $landlord->name,
            'email' => $landlord->email,
            'type' => $landlordDetail?->type->value ?? 'individual',
            'type_label' => $landlordDetail?->type->label() ?? 'Individual',
            'id_number' => $landlordDetail?->id_number,
            'tin' => $landlordDetail?->tin,
            'id_document_type_label' => $landlordDetail?->id_document_type?->label(),
            'address' => $landlordDetail?->address,
            'phone' => $landlordDetail?->phone,
            'notes' => $landlordDetail?->notes,
            'avatar' => $landlord->getFirstMediaUrl('avatar') ?: null,
            'id_document' => $document ? [
                'name' => $document->file_name,
                'url' => $document->getUrl(),
            ] : null,
            'stats' => [
                'properties_count' => count($propertyIds),
                'units_count' => $unitsTotal,
                'occupancy_rate' => $unitsTotal > 0 ? (int) round($occupiedCount / $unitsTotal * 100) : null,
                'collected_ytd' => $totalIncome,
            ],
            'performance' => [
                'total_income' => $totalIncome,
                'total_expenses' => $totalExpenses,
                'net' => (string) ((float) $totalIncome - (float) $totalExpenses),
                'due_this_month' => number_format($dueThisMonth, 2, '.', ''),
                'collected_this_month' => number_format($collectedThisMonth, 2, '.', ''),
            ],
            'property_ids' => $propertyIds,
            'created_at' => $landlord->created_at?->toIso8601String(),
        ];
    }

    /**
     * @param  'asc'|'desc'  $dir
     * @return array{data: array<int, array<string, mixed>>, meta: array<string, mixed>}
     */
    private function paginatedLandlordPropertiesTable(User $landlord, string $sort, string $dir, int $perPage, int $page): array
    {
        $query = $landlord->properties()->withCount('units')->with('units.currentPrice');
        $sortColumn = in_array($sort, ['name', 'type'], true) ? $sort : 'name';
        $query->orderBy($sortColumn, $dir)->orderBy('id');

        $paginator = $query->paginate($perPage, page: $page);

        return [
            'data' => $paginator->getCollection()->map(function (Property $property) use ($landlord): array {
                $units = $property->units;
                $occupied = $units->filter(fn (Unit $unit) => $unit->status === UnitStatus::Occupied)->count();
                $vacant = $units->filter(fn (Unit $unit) => $unit->status === UnitStatus::Vacant)->count();
                $prices = $units->map(fn (Unit $unit) => $unit->currentPrice?->amount)
                    ->filter(fn (?string $amount) => $amount !== null)
                    ->map(fn (string $amount) => (float) $amount)
                    ->sort()
                    ->values();

                return [
                    'id' => $property->id,
                    'code' => $property->code,
                    'name' => $property->name,
                    'type' => $property->type->value,
                    'type_label' => $property->type->label(),
                    'address' => $property->address,
                    'landlord_id' => $landlord->id,
                    'landlord_name' => $landlord->name,
                    'units_count' => $property->units_count,
                    'units_summary' => ['total' => $units->count(), 'vacant' => $vacant, 'occupied' => $occupied],
                    'price_range' => [
                        'low' => $prices->isEmpty() ? null : (string) $prices->first(),
                        'high' => $prices->isEmpty() ? null : (string) $prices->last(),
                    ],
                    'photo_url' => $property->getFirstMediaUrl('photos') ?: null,
                    'created_at' => $property->created_at?->toIso8601String(),
                ];
            })->all(),
            'meta' => $this->paginationMeta($paginator),
        ];
    }

    /**
     * @param  array<int, int>  $propertyIds
     * @param  'asc'|'desc'  $dir
     * @return array{data: array<int, array<string, mixed>>, meta: array<string, mixed>}
     */
    private function paginatedLandlordUnitsTable(array $propertyIds, string $sort, string $dir, int $perPage, int $page): array
    {
        $query = Unit::query()->whereIn('property_id', $propertyIds)->with(['unitType', 'property', 'currentPrice'])->withCount('features');

        if ($sort === 'property') {
            $query->join('properties', 'properties.id', '=', 'units.property_id')
                ->select('units.*')
                ->orderBy('properties.name', $dir);
        } else {
            $sortColumn = $sort === 'status' ? 'status' : 'name';
            $query->orderBy($sortColumn, $dir);
        }

        $query->orderBy('units.id');

        $paginator = $query->paginate($perPage, page: $page);

        return [
            'data' => $paginator->getCollection()->map(fn (Unit $unit): array => [
                'id' => $unit->id,
                'code' => $unit->code,
                'name' => $unit->name,
                'unit_type_label' => $unit->unitType?->label,
                'size' => $unit->size,
                'status' => $unit->status->value,
                'status_label' => $unit->status->label(),
                'current_price' => $unit->currentPrice !== null ? [
                    'amount' => (string) $unit->currentPrice->amount,
                    'billing_period_label' => $unit->currentPrice->billing_period->label(),
                ] : null,
                'features_count' => $unit->features_count,
                'photo_url' => $unit->getFirstMediaUrl('photos') ?: null,
                'created_at' => $unit->created_at?->toIso8601String(),
                'property' => $unit->property !== null ? [
                    'id' => $unit->property->id,
                    'name' => $unit->property->name,
                ] : null,
            ])->all(),
            'meta' => $this->paginationMeta($paginator),
        ];
    }

    /**
     * @param  array<int, int>  $unitIds
     * @param  'asc'|'desc'  $dir
     * @return array{data: array<int, array<string, mixed>>, meta: array<string, mixed>}
     */
    private function paginatedLandlordTenantsTable(array $unitIds, string $sort, string $dir, int $perPage, int $page): array
    {
        $query = Tenant::query()
            ->whereHas('leases', fn (Builder $q) => $q->where('status', LeaseStatus::Active->value)->whereIn('unit_id', $unitIds))
            ->with(['leases' => fn ($query) => $query->where('status', LeaseStatus::Active->value)->whereIn('unit_id', $unitIds)->with('unit.property')]);

        $sortColumn = $sort === 'phone' ? 'phone' : 'name';
        $query->orderBy($sortColumn, $dir)->orderBy('id');

        $paginator = $query->paginate($perPage, page: $page);

        return [
            'data' => $paginator->getCollection()->map(function (Tenant $tenant): array {
                $lease = $tenant->leases->first();

                return [
                    'id' => $tenant->id,
                    'name' => $tenant->name,
                    'email' => $tenant->email,
                    'phone' => $tenant->phone,
                    'avatar' => $tenant->getFirstMediaUrl('avatar') ?: null,
                    'active_lease' => $lease !== null ? [
                        'id' => $lease->id,
                        'unit_name' => $lease->unit?->name,
                        'property_name' => $lease->unit?->property?->name,
                    ] : null,
                    'created_at' => $tenant->created_at?->toIso8601String(),
                ];
            })->all(),
            'meta' => $this->paginationMeta($paginator),
        ];
    }

    /**
     * @param  array<int, int>  $propertyIds
     * @param  'asc'|'desc'  $dir
     * @return array{data: array<int, array<string, mixed>>, meta: array<string, mixed>}
     */
    private function paginatedLandlordPaymentsTable(array $propertyIds, string $sort, string $dir, int $perPage, int $page): array
    {
        $query = Payment::query()
            ->whereHas('lease.unit', fn (Builder $q) => $q->whereIn('property_id', $propertyIds))
            ->with(['tenant', 'lease.unit.property']);
        $sortColumn = $sort === 'amount' ? 'amount' : 'payment_date';
        $query->orderBy($sortColumn, $dir)->orderBy('id');

        $paginator = $query->paginate($perPage, page: $page);

        return [
            'data' => $paginator->getCollection()->map(fn (Payment $payment): array => [
                'id' => $payment->id,
                'unit_name' => $payment->lease?->unit?->name,
                'property_name' => $payment->lease?->unit?->property?->name,
                'tenant_name' => $payment->tenant?->name,
                'amount' => (string) $payment->amount,
                'payment_date' => $payment->payment_date->toDateString(),
                'method_label' => $payment->method->label(),
                'status' => $payment->status->value,
                'status_label' => $payment->status->label(),
            ])->all(),
            'meta' => $this->paginationMeta($paginator),
        ];
    }

    /**
     * @param  array<int, int>  $propertyIds
     * @param  'asc'|'desc'  $dir
     * @return array{data: array<int, array<string, mixed>>, meta: array<string, mixed>}
     */
    private function paginatedLandlordMaintenanceTable(array $propertyIds, string $sort, string $dir, int $perPage, int $page): array
    {
        $query = MaintenanceRequest::query()
            ->whereHas('unit', fn (Builder $q) => $q->whereIn('property_id', $propertyIds))
            ->with(['unit.property', 'assignedTo']);
        $sortColumn = in_array($sort, ['status', 'priority'], true) ? $sort : 'created_at';
        $query->orderBy($sortColumn, $dir)->orderBy('id');

        $paginator = $query->paginate($perPage, page: $page);

        return [
            'data' => $paginator->getCollection()->map(fn (MaintenanceRequest $request): array => [
                'id' => $request->id,
                'title' => $request->title,
                'unit_name' => $request->unit?->name,
                'property_name' => $request->unit?->property?->name,
                'priority' => $request->priority->value,
                'priority_label' => $request->priority->label(),
                'status' => $request->status->value,
                'status_label' => $request->status->label(),
                'assigned_to_name' => $request->assignedTo?->name,
                'cost' => $request->cost !== null ? (string) $request->cost : null,
                'scheduled_date' => $request->scheduled_date?->toDateString(),
                'created_at' => $request->created_at?->toIso8601String(),
            ])->all(),
            'meta' => $this->paginationMeta($paginator),
        ];
    }

    /**
     * @param  array<int, int>  $propertyIds
     * @param  'asc'|'desc'  $dir
     * @return array{data: array<int, array<string, mixed>>, meta: array<string, mixed>}
     */
    private function paginatedLandlordDocumentsTable(array $propertyIds, string $sort, string $dir, int $perPage, int $page): array
    {
        $query = Document::query()
            ->whereHasMorph('documentable', [Property::class], fn (Builder $q) => $q->whereIn('id', $propertyIds))
            ->with(['media', 'category', 'documentable']);
        $sortColumn = $sort === 'title' ? 'title' : 'created_at';
        $query->orderBy($sortColumn, $dir)->orderBy('id');

        $paginator = $query->paginate($perPage, page: $page);

        return [
            'data' => $paginator->getCollection()->map(function (Document $document): array {
                $file = $document->getFirstMedia('file');

                return [
                    'id' => $document->id,
                    'code' => $document->code,
                    'title' => $document->title,
                    'category' => $document->category?->name ?? '',
                    'category_label' => $document->category?->name,
                    'documentable_type' => 'property',
                    'documentable_label' => $document->documentable?->name,
                    'uploaded_by_name' => $document->uploadedBy?->name,
                    'file' => $file ? ['name' => $file->file_name, 'url' => $file->getUrl()] : null,
                    'created_at' => $document->created_at?->toIso8601String(),
                ];
            })->all(),
            'meta' => $this->paginationMeta($paginator),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function paginationMeta(LengthAwarePaginator $paginator): array
    {
        return [
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
            'from' => $paginator->firstItem(),
            'to' => $paginator->lastItem(),
        ];
    }
}
