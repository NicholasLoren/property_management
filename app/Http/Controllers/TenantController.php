<?php

namespace App\Http\Controllers;

use App\Enums\BillingPeriod;
use App\Enums\LeaseStatus;
use App\Enums\PartyType;
use App\Enums\PaymentScheduleStatus;
use App\Enums\PaymentStatus;
use App\Http\Requests\Tenants\StoreTenantRequest;
use App\Http\Requests\Tenants\UpdateTenantRequest;
use App\Models\Document;
use App\Models\Lease;
use App\Models\Payment;
use App\Models\PaymentSchedule;
use App\Models\Property;
use App\Models\Tenant;
use App\Settings\ComplianceSettings;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TenantController extends Controller
{
    private const PAYMENT_STATUSES = ['paid', 'overdue', 'partial', 'due_today'];

    private const TENANT_STATUSES = ['active', 'moved_out', 'lease_expired', 'expiring_30'];

    public function index(Request $request): Response
    {
        $filters = $this->parseFilters($request);
        $dir = $request->string('dir', 'asc')->value() === 'desc' ? 'desc' : 'asc';
        $perPage = (int) $request->integer('per_page', 10);
        $perPage = in_array($perPage, [10, 25, 50], true) ? $perPage : 10;

        $query = $filters['tab'] === 'trash'
            ? Tenant::onlyTrashed()->with('deletedBy')
            : Tenant::query();

        $query->with(['leases' => fn ($q) => $q->where('status', LeaseStatus::Active->value)->with('unit.property'), 'media']);

        if ($filters['search'] !== '') {
            $query->where(fn ($q) => $q->where('name', 'like', "%{$filters['search']}%")
                ->orWhere('email', 'like', "%{$filters['search']}%")
                ->orWhere('phone', 'like', "%{$filters['search']}%"));
        }

        // These filters all key off lease/payment-schedule state, which the
        // trash query (soft-deleted tenants) doesn't meaningfully have.
        if ($filters['tab'] !== 'trash') {
            // Scoped to the active lease only — otherwise a tenant who once
            // lived at this property (or billed on this cadence) on a now-
            // ended lease would wrongly match a filter about their current tenancy.
            if ($filters['property'] !== 'all') {
                $query->whereHas(
                    'leases',
                    fn (Builder $q) => $q->where('status', LeaseStatus::Active->value)
                        ->whereHas('unit', fn (Builder $u) => $u->where('property_id', $filters['property'])),
                );
            }

            if ($filters['billing_period'] !== 'all') {
                $query->whereHas(
                    'leases',
                    fn (Builder $q) => $q->where('status', LeaseStatus::Active->value)
                        ->where('billing_period', $filters['billing_period']),
                );
            }

            if ($filters['status'] !== 'all') {
                $this->applyTenantStatusFilter($query, $filters['status']);
            }

            if ($filters['payment_status'] !== 'all') {
                $this->applyPaymentStatusFilter($query, $filters['payment_status']);
            }
        }

        $query->orderBy('name', $dir)->orderBy('id');

        $paginator = $query->paginate($perPage)->withQueryString();

        return Inertia::render('tenants/index', [
            'tenants' => [
                'data' => $paginator->getCollection()
                    ->map(fn (Tenant $tenant) => $this->transform($tenant, $filters['tab'] === 'trash'))
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
                'dir' => $dir,
                'per_page' => $perPage,
                'tab' => $filters['tab'],
                'property' => $filters['property'],
                'payment_status' => $filters['payment_status'],
                'billing_period' => $filters['billing_period'],
                'status' => $filters['status'],
            ],
            'counts' => [
                'active' => Tenant::count(),
                'trash' => Tenant::onlyTrashed()->count(),
            ],
            // Closures so a partial reload that excludes these (search, sort,
            // pagination, filter apply — none of which change the option
            // lists themselves) skips the query entirely instead of paying
            // for it on every keystroke/page-turn.
            'properties' => fn () => $this->propertyOptions(),
            'paymentStatuses' => fn () => $this->paymentStatusOptions(),
            'billingPeriods' => fn () => $this->billingPeriodOptions(),
            'tenantStatuses' => fn () => $this->tenantStatusOptions(),
        ]);
    }

    /**
     * @return array{tab: string, search: string, property: string, payment_status: string, billing_period: string, status: string}
     */
    private function parseFilters(Request $request): array
    {
        $property = $request->string('property', 'all')->value();
        $paymentStatus = $request->string('payment_status', 'all')->value();
        $billingPeriod = $request->string('billing_period', 'all')->value();
        $status = $request->string('status', 'all')->value();

        return [
            'tab' => $request->string('tab', 'active')->value() === 'trash' ? 'trash' : 'active',
            'search' => $request->string('search')->trim()->value(),
            'property' => $property !== '' && ctype_digit($property) ? $property : 'all',
            'payment_status' => in_array($paymentStatus, self::PAYMENT_STATUSES, true) ? $paymentStatus : 'all',
            'billing_period' => in_array($billingPeriod, array_column(BillingPeriod::cases(), 'value'), true) ? $billingPeriod : 'all',
            'status' => in_array($status, self::TENANT_STATUSES, true) ? $status : 'all',
        ];
    }

    private function applyTenantStatusFilter(Builder $query, string $status): void
    {
        match ($status) {
            'active' => $query->whereHas(
                'leases',
                fn (Builder $q) => $q->where('status', LeaseStatus::Active->value),
            ),
            'expiring_30' => $query->whereHas(
                'leases',
                fn (Builder $q) => $q->where('status', LeaseStatus::Active->value)
                    ->whereBetween('end_date', [now()->toDateString(), now()->addDays(30)->toDateString()]),
            ),
            // A tenant only counts as "moved out" / "lease expired" once they
            // have no currently active lease — otherwise a tenant who was
            // once terminated elsewhere but is active today would wrongly show up here.
            'moved_out' => $query
                ->whereDoesntHave('leases', fn (Builder $q) => $q->where('status', LeaseStatus::Active->value))
                ->whereHas('leases', fn (Builder $q) => $q->where('status', LeaseStatus::Terminated->value)),
            'lease_expired' => $query
                ->whereDoesntHave('leases', fn (Builder $q) => $q->where('status', LeaseStatus::Active->value))
                ->whereHas('leases', fn (Builder $q) => $q->where('status', LeaseStatus::Ended->value)),
            default => null,
        };
    }

    private function applyPaymentStatusFilter(Builder $query, string $status): void
    {
        match ($status) {
            'overdue' => $query->whereHas(
                'leases',
                fn (Builder $l) => $l->where('status', LeaseStatus::Active->value)
                    ->whereHas('paymentSchedules', fn (Builder $p) => $p->overdue()),
            ),
            'due_today' => $query->whereHas(
                'leases',
                fn (Builder $l) => $l->where('status', LeaseStatus::Active->value)
                    ->whereHas('paymentSchedules', fn (Builder $p) => $p
                        ->where('status', PaymentScheduleStatus::Pending->value)
                        ->whereDate('period_start', now()->toDateString())),
            ),
            'partial' => $query->whereHas(
                'leases',
                fn (Builder $l) => $l->where('status', LeaseStatus::Active->value)
                    ->whereHas('paymentSchedules', fn (Builder $p) => $p->where('status', PaymentScheduleStatus::Partial->value)),
            ),
            // Scoped to the active lease's own schedules only, mirroring the
            // overdue/partial/due_today cases above — otherwise a tenant
            // whose current lease is fully settled but who left unpaid back-rent
            // on an old, ended lease would match neither "paid" nor "overdue".
            'paid' => $query->whereHas(
                'leases',
                fn (Builder $l) => $l->where('status', LeaseStatus::Active->value)
                    ->whereDoesntHave('paymentSchedules', fn (Builder $p) => $p->where(
                        fn (Builder $q) => $q->overdue()
                            ->orWhere('status', PaymentScheduleStatus::Partial->value)
                            ->orWhere(fn (Builder $qq) => $qq
                                ->where('status', PaymentScheduleStatus::Pending->value)
                                ->whereDate('period_start', now()->toDateString())),
                    )),
            ),
            default => null,
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
    private function paymentStatusOptions(): array
    {
        return [
            ['value' => 'paid', 'label' => 'Paid'],
            ['value' => 'overdue', 'label' => 'Overdue'],
            ['value' => 'partial', 'label' => 'Partial'],
            ['value' => 'due_today', 'label' => 'Due Today'],
        ];
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function billingPeriodOptions(): array
    {
        return array_map(
            fn (BillingPeriod $period): array => ['value' => $period->value, 'label' => $period->label()],
            BillingPeriod::cases(),
        );
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function tenantStatusOptions(): array
    {
        return [
            ['value' => 'active', 'label' => 'Active'],
            ['value' => 'moved_out', 'label' => 'Moved Out'],
            ['value' => 'lease_expired', 'label' => 'Lease Expired'],
            ['value' => 'expiring_30', 'label' => 'Expiring in 30 Days'],
        ];
    }

    public function create(ComplianceSettings $compliance): Response
    {
        return Inertia::render('tenants/form', [
            'compliance_enabled' => $compliance->enabled,
        ]);
    }

    public function store(StoreTenantRequest $request): RedirectResponse
    {
        $tenant = Tenant::create([
            'name' => $request->validated('name'),
            'type' => $request->validated('type') ?? PartyType::Individual->value,
            'email' => $request->validated('email'),
            'phone' => $request->validated('phone'),
            'id_number' => $request->validated('id_number'),
            'tin' => $request->validated('tin'),
            'id_document_type' => $request->validated('id_document_type'),
            'address' => $request->validated('address'),
            'notes' => $request->validated('notes'),
            'contact_person_name' => $request->validated('contact_person_name'),
            'contact_person_phone' => $request->validated('contact_person_phone'),
            'contact_person_email' => $request->validated('contact_person_email'),
        ]);

        $this->syncIdDocument($request, $tenant);
        $this->syncAvatar($request, $tenant);

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$tenant->name} was added."]);

        return to_route('tenants.index');
    }

    public function edit(Tenant $tenant, ComplianceSettings $compliance): Response
    {
        $tenant->load('media');

        return Inertia::render('tenants/form', [
            'tenant' => $this->transformForForm($tenant),
            'compliance_enabled' => $compliance->enabled,
        ]);
    }

    public function update(UpdateTenantRequest $request, Tenant $tenant): RedirectResponse
    {
        $tenant->update([
            'name' => $request->validated('name'),
            'type' => $request->validated('type') ?? PartyType::Individual->value,
            'email' => $request->validated('email'),
            'phone' => $request->validated('phone'),
            'id_number' => $request->validated('id_number'),
            'tin' => $request->validated('tin'),
            'id_document_type' => $request->validated('id_document_type'),
            'address' => $request->validated('address'),
            'notes' => $request->validated('notes'),
            'contact_person_name' => $request->validated('contact_person_name'),
            'contact_person_phone' => $request->validated('contact_person_phone'),
            'contact_person_email' => $request->validated('contact_person_email'),
        ]);

        $this->syncIdDocument($request, $tenant);
        $this->syncAvatar($request, $tenant);

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$tenant->name} was updated."]);

        return to_route('tenants.index');
    }

    public function show(Request $request, Tenant $tenant, ComplianceSettings $compliance): Response
    {
        $tenant->load([
            'media',
            'leases' => fn ($query) => $query->with(['unit.property', 'signatures', 'tenants'])->orderByDesc('start_date'),
        ]);

        $tab = $request->string('tab', 'payments')->value();
        $tab = in_array($tab, ['payments', 'upcoming', 'documents'], true) ? $tab : 'payments';

        $sort = $request->string('sort')->value();
        $dir = $request->string('dir', 'desc')->value() === 'asc' ? 'asc' : 'desc';
        $perPage = (int) $request->integer('per_page', 10);
        $perPage = in_array($perPage, [10, 25, 50], true) ? $perPage : 10;
        $page = max(1, (int) $request->integer('page', 1));

        $fetchPayments = fn () => $this->paginatedTenantPaymentsTable($tenant, $sort, $dir, $perPage, $page);
        $fetchUpcoming = fn () => $this->paginatedTenantUpcomingTable($tenant, $sort, $dir, $perPage, $page);
        $fetchDocuments = fn () => $this->paginatedTenantDocumentsTable($tenant, $sort, $dir, $perPage, $page);

        return Inertia::render('tenants/show', [
            'tenant' => $this->transformForShow($tenant),
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
            'paymentsTable' => $tab === 'payments' ? Inertia::defer($fetchPayments) : Inertia::optional($fetchPayments),
            'upcomingTable' => $tab === 'upcoming' ? Inertia::defer($fetchUpcoming) : Inertia::optional($fetchUpcoming),
            'documentsTable' => $tab === 'documents' ? Inertia::defer($fetchDocuments) : Inertia::optional($fetchDocuments),
        ]);
    }

    public function destroy(Request $request, Tenant $tenant): RedirectResponse
    {
        $tenant->forceFill(['deleted_by' => $request->user()->id])->save();
        $tenant->delete();

        return back();
    }

    public function restore(Tenant $tenant): RedirectResponse
    {
        $tenant->restore();
        $tenant->forceFill(['deleted_by' => null])->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$tenant->name} was restored."]);

        return back();
    }

    public function forceDelete(Tenant $tenant): RedirectResponse
    {
        $name = $tenant->name;
        $tenant->forceDelete();

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$name} was permanently deleted."]);

        return back();
    }

    private function syncIdDocument(Request $request, Tenant $tenant): void
    {
        if ($request->hasFile('id_document')) {
            $tenant->addMediaFromRequest('id_document')->toMediaCollection('id_document');
        } elseif ($request->boolean('id_document_remove')) {
            $tenant->clearMediaCollection('id_document');
        }
    }

    private function syncAvatar(Request $request, Tenant $tenant): void
    {
        if ($request->hasFile('avatar')) {
            $tenant->addMediaFromRequest('avatar')->toMediaCollection('avatar');
        } elseif ($request->boolean('avatar_remove')) {
            $tenant->clearMediaCollection('avatar');
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function transform(Tenant $tenant, bool $withTrashMeta = false): array
    {
        $activeLease = $tenant->leases->first();

        $data = [
            'id' => $tenant->id,
            'name' => $tenant->name,
            'type' => $tenant->type->value,
            'type_label' => $tenant->type->label(),
            'email' => $tenant->email,
            'phone' => $tenant->phone,
            'avatar' => $tenant->getFirstMediaUrl('avatar') ?: null,
            'active_lease' => $activeLease !== null ? [
                'id' => $activeLease->id,
                'unit_name' => $activeLease->unit?->name,
                'property_name' => $activeLease->unit?->property?->name,
            ] : null,
            'created_at' => $tenant->created_at?->toIso8601String(),
        ];

        if ($withTrashMeta) {
            $data['deleted_at'] = $tenant->deleted_at?->toIso8601String();
            $data['deleted_by_name'] = $tenant->deletedBy?->name;
        }

        return $data;
    }

    /**
     * @return array<string, mixed>
     */
    private function transformForForm(Tenant $tenant): array
    {
        $document = $tenant->getFirstMedia('id_document');
        $avatar = $tenant->getFirstMedia('avatar');

        return [
            'id' => $tenant->id,
            'name' => $tenant->name,
            'type' => $tenant->type->value,
            'email' => $tenant->email,
            'phone' => $tenant->phone,
            'id_number' => $tenant->id_number,
            'tin' => $tenant->tin,
            'id_document_type' => $tenant->id_document_type?->value,
            'address' => $tenant->address,
            'notes' => $tenant->notes,
            'contact_person_name' => $tenant->contact_person_name,
            'contact_person_phone' => $tenant->contact_person_phone,
            'contact_person_email' => $tenant->contact_person_email,
            'avatar' => $avatar ? ['name' => $avatar->file_name, 'url' => $avatar->getUrl()] : null,
            'id_document' => $document ? [
                'name' => $document->file_name,
                'url' => $document->getUrl(),
            ] : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformForShow(Tenant $tenant): array
    {
        $document = $tenant->getFirstMedia('id_document');
        $activeLeases = $tenant->leases->where('status', LeaseStatus::Active);

        // Outstanding is scoped to the tenant's active lease(s) only — money
        // owed on a lease that's already ended is a separate concern
        // (visible on that lease's own page) rather than something that
        // should follow the tenant around here indefinitely.
        $outstanding = PaymentSchedule::query()
            ->whereIn('lease_id', $activeLeases->pluck('id'))
            ->whereIn('status', [PaymentScheduleStatus::Pending->value, PaymentScheduleStatus::Partial->value])
            ->withSum(['payments as paid_amount' => fn ($query) => $query->where('status', PaymentStatus::Completed->value)], 'amount')
            ->get()
            ->sum(fn (PaymentSchedule $schedule) => round((float) $schedule->amount_expected - (float) ($schedule->paid_amount ?? 0), 2));

        return [
            'id' => $tenant->id,
            'name' => $tenant->name,
            'type' => $tenant->type->value,
            'type_label' => $tenant->type->label(),
            'email' => $tenant->email,
            'phone' => $tenant->phone,
            'id_number' => $tenant->id_number,
            'tin' => $tenant->tin,
            'id_document_type_label' => $tenant->id_document_type?->label(),
            'address' => $tenant->address,
            'notes' => $tenant->notes,
            'contact_person_name' => $tenant->contact_person_name,
            'contact_person_phone' => $tenant->contact_person_phone,
            'contact_person_email' => $tenant->contact_person_email,
            'avatar' => $tenant->getFirstMediaUrl('avatar') ?: null,
            'id_document' => $document ? [
                'name' => $document->file_name,
                'url' => $document->getUrl(),
            ] : null,
            'stats' => [
                'active_leases_count' => $activeLeases->count(),
                'total_paid' => number_format((float) $tenant->payments()->where('status', PaymentStatus::Completed->value)->sum('amount'), 2, '.', ''),
                'outstanding' => number_format($outstanding, 2, '.', ''),
                'tenant_since' => $tenant->leases->min('start_date')?->toDateString(),
            ],
            'leases' => $tenant->leases->map(fn (Lease $lease) => [
                'id' => $lease->id,
                'lease_number' => $lease->lease_number,
                'unit_name' => $lease->unit?->name,
                'property_name' => $lease->unit?->property?->name,
                'status' => $lease->status->value,
                'status_label' => $lease->status->label(),
                'start_date' => $lease->start_date->toDateString(),
                'end_date' => $lease->end_date->toDateString(),
                'rent_amount' => (string) $lease->rent_amount,
                'billing_period_label' => $lease->billing_period->label(),
                'is_fully_signed' => $lease->isFullySigned(),
            ])->all(),
            'created_at' => $tenant->created_at?->toIso8601String(),
        ];
    }

    /**
     * @param  'asc'|'desc'  $dir
     * @return array{data: array<int, array<string, mixed>>, meta: array<string, mixed>}
     */
    private function paginatedTenantPaymentsTable(Tenant $tenant, string $sort, string $dir, int $perPage, int $page): array
    {
        $query = $tenant->payments()->with(['lease.unit.property']);
        $sortColumn = $sort === 'amount' ? 'amount' : 'payment_date';
        $query->orderBy($sortColumn, $dir)->orderBy('id');

        $paginator = $query->paginate($perPage, page: $page);

        return [
            'data' => $paginator->getCollection()->map(fn (Payment $payment): array => [
                'id' => $payment->id,
                'unit_name' => $payment->lease?->unit?->name,
                'property_name' => $payment->lease?->unit?->property?->name,
                'tenant_name' => $tenant->name,
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
     * @param  'asc'|'desc'  $dir
     * @return array{data: array<int, array<string, mixed>>, meta: array<string, mixed>}
     */
    private function paginatedTenantUpcomingTable(Tenant $tenant, string $sort, string $dir, int $perPage, int $page): array
    {
        $activeLeaseIds = $tenant->leases()->where('leases.status', LeaseStatus::Active->value)->pluck('leases.id');

        $query = PaymentSchedule::query()
            ->whereIn('lease_id', $activeLeaseIds)
            ->whereIn('status', [PaymentScheduleStatus::Pending->value, PaymentScheduleStatus::Partial->value])
            ->with('lease.unit.property')
            ->withSum(['payments as paid_amount' => fn ($query) => $query->where('status', PaymentStatus::Completed->value)], 'amount');

        $sortColumn = match ($sort) {
            'status' => 'status',
            'amount_expected' => 'amount_expected',
            default => 'period_start',
        };
        $query->orderBy($sortColumn, $dir)->orderBy('id');

        $paginator = $query->paginate($perPage, page: $page);
        $today = now()->startOfDay();

        return [
            'data' => $paginator->getCollection()->map(fn (PaymentSchedule $schedule): array => [
                'id' => $schedule->id,
                'unit_name' => $schedule->lease?->unit?->name,
                'property_name' => $schedule->lease?->unit?->property?->name,
                'period_start' => $schedule->period_start->toDateString(),
                'period_end' => $schedule->period_end->toDateString(),
                'amount_expected' => (string) $schedule->amount_expected,
                'amount_paid' => number_format((float) ($schedule->paid_amount ?? 0), 2, '.', ''),
                'status' => $schedule->status->value,
                'status_label' => $schedule->status->label(),
                'is_overdue' => in_array($schedule->status, [PaymentScheduleStatus::Pending, PaymentScheduleStatus::Partial], true)
                    && $schedule->period_start->lessThan($today),
            ])->all(),
            'meta' => $this->paginationMeta($paginator),
        ];
    }

    /**
     * @param  'asc'|'desc'  $dir
     * @return array{data: array<int, array<string, mixed>>, meta: array<string, mixed>}
     */
    private function paginatedTenantDocumentsTable(Tenant $tenant, string $sort, string $dir, int $perPage, int $page): array
    {
        $query = $tenant->documents()->with(['media', 'category']);
        $sortColumn = $sort === 'title' ? 'title' : 'created_at';
        $query->orderBy($sortColumn, $dir)->orderBy('id');

        $paginator = $query->paginate($perPage, page: $page);

        return [
            'data' => $paginator->getCollection()->map(fn (Document $document): array => [
                'id' => $document->id,
                'code' => $document->code,
                'title' => $document->title,
                'category' => $document->category?->name ?? '',
                'category_label' => $document->category?->name,
                'documentable_type' => 'tenant',
                'documentable_label' => $tenant->name,
                'uploaded_by_name' => $document->uploadedBy?->name,
                'file' => $document->getFirstMedia('file') ? [
                    'name' => $document->getFirstMedia('file')->file_name,
                    'url' => $document->getFirstMediaUrl('file'),
                ] : null,
                'created_at' => $document->created_at?->toIso8601String(),
            ])->all(),
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
