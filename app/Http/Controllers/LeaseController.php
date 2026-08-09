<?php

namespace App\Http\Controllers;

use App\Enums\BillingPeriod;
use App\Enums\LeaseStatus;
use App\Enums\PaymentScheduleStatus;
use App\Enums\PaymentStatus;
use App\Http\Requests\Leases\StoreLeaseRequest;
use App\Http\Requests\Leases\UpdateLeaseRequest;
use App\Models\Lease;
use App\Models\Payment;
use App\Models\PaymentSchedule;
use App\Models\Tenant;
use App\Models\Unit;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LeaseController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $this->parseFilters($request);
        $sort = $request->string('sort', 'start_date')->value();
        $dir = $request->string('dir', 'desc')->value() === 'asc' ? 'asc' : 'desc';
        $perPage = (int) $request->integer('per_page', 10);
        $perPage = in_array($perPage, [10, 25, 50], true) ? $perPage : 10;

        $query = $filters['tab'] === 'trash'
            ? Lease::onlyTrashed()->with('deletedBy')
            : Lease::query();

        $query->with(['unit.property', 'tenants']);

        if ($filters['search'] !== '') {
            $query->where(fn (Builder $q) => $q->whereHas('tenants', fn (Builder $t) => $t->where('name', 'like', "%{$filters['search']}%"))
                ->orWhereHas('unit', fn (Builder $u) => $u->where('name', 'like', "%{$filters['search']}%"))
                ->orWhereHas('unit.property', fn (Builder $p) => $p->where('name', 'like', "%{$filters['search']}%")));
        }

        if ($filters['tab'] !== 'trash') {
            if ($filters['statuses'] !== []) {
                $query->whereIn('status', $filters['statuses']);
            }

            if ($filters['unitIds'] !== []) {
                $query->whereIn('unit_id', $filters['unitIds']);
            }
        }

        $sortColumn = $sort === 'status' ? 'status' : 'start_date';
        $query->orderBy($sortColumn, $dir)->orderBy('id');

        $paginator = $query->paginate($perPage)->withQueryString();

        return Inertia::render('leases/index', [
            'leases' => [
                'data' => $paginator->getCollection()
                    ->map(fn (Lease $lease) => $this->transform($lease, $filters['tab'] === 'trash'))
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
                'unit_id' => $filters['unitIds'],
                'sort' => $sort,
                'dir' => $dir,
                'per_page' => $perPage,
                'tab' => $filters['tab'],
            ],
            'counts' => [
                'active' => Lease::count(),
                'trash' => Lease::onlyTrashed()->count(),
            ],
            'statuses' => $this->statusOptions(),
            'units' => $this->unitOptions(),
        ]);
    }

    /**
     * @return array{tab: string, search: string, statuses: array<int, string>, unitIds: array<int, string>}
     */
    private function parseFilters(Request $request): array
    {
        return [
            'tab' => $request->string('tab', 'active')->value() === 'trash' ? 'trash' : 'active',
            'search' => $request->string('search')->trim()->value(),
            'statuses' => array_values(array_intersect(
                (array) $request->input('status', []),
                array_column(LeaseStatus::cases(), 'value'),
            )),
            'unitIds' => array_values(array_filter((array) $request->input('unit_id', []))),
        ];
    }

    public function create(): Response
    {
        return Inertia::render('leases/form', [
            'units' => $this->unitOptions(),
            'tenants' => $this->tenantOptions(),
            'statuses' => $this->statusOptions(),
            'billingPeriods' => $this->billingPeriodOptions(),
        ]);
    }

    public function store(StoreLeaseRequest $request): RedirectResponse
    {
        $lease = Lease::create([
            'unit_id' => $request->validated('unit_id'),
            'start_date' => $request->validated('start_date'),
            'end_date' => $request->validated('end_date'),
            'rent_amount' => $request->validated('rent_amount'),
            'billing_period' => $request->validated('billing_period'),
            'billing_day' => $request->validated('billing_day'),
            'custom_interval_months' => $request->validated('custom_interval_months'),
            'security_deposit' => $request->validated('security_deposit'),
            'status' => $request->validated('status'),
            'notes' => $request->validated('notes'),
        ]);

        $lease->tenants()->sync($request->validated('tenant_ids'));
        $this->syncDocument($request, $lease);

        Inertia::flash('toast', ['type' => 'success', 'message' => "Lease #{$lease->id} was added."]);

        return to_route('leases.index');
    }

    public function edit(Lease $lease): Response
    {
        $lease->load(['unit.property', 'tenants', 'media']);

        return Inertia::render('leases/form', [
            'lease' => $this->transformForForm($lease),
            'units' => $this->unitOptions(),
            'tenants' => $this->tenantOptions(),
            'statuses' => $this->statusOptions(),
            'billingPeriods' => $this->billingPeriodOptions(),
        ]);
    }

    public function update(UpdateLeaseRequest $request, Lease $lease): RedirectResponse
    {
        $lease->update([
            'start_date' => $request->validated('start_date'),
            'end_date' => $request->validated('end_date'),
            'rent_amount' => $request->validated('rent_amount'),
            'billing_period' => $request->validated('billing_period'),
            'billing_day' => $request->validated('billing_day'),
            'custom_interval_months' => $request->validated('custom_interval_months'),
            'security_deposit' => $request->validated('security_deposit'),
            'status' => $request->validated('status'),
            'notes' => $request->validated('notes'),
        ]);

        $lease->tenants()->sync($request->validated('tenant_ids'));

        if ($request->boolean('document_remove')) {
            $lease->clearMediaCollection('document');
        }

        $this->syncDocument($request, $lease);

        Inertia::flash('toast', ['type' => 'success', 'message' => "Lease #{$lease->id} was updated."]);

        return to_route('leases.index');
    }

    public function show(Request $request, Lease $lease): Response
    {
        $lease->load([
            'unit.property',
            'tenants',
            'media',
            'payments' => fn ($query) => $query->orderByDesc('payment_date'),
        ]);

        $tab = $request->string('tab', 'payments')->value();
        $tab = in_array($tab, ['payments', 'schedule'], true) ? $tab : 'payments';

        $sort = $request->string('sort', 'period_start')->value();
        $dir = $request->string('dir', 'asc')->value() === 'desc' ? 'desc' : 'asc';
        $perPage = (int) $request->integer('per_page', 10);
        $perPage = in_array($perPage, [10, 25, 50], true) ? $perPage : 10;
        $page = max(1, (int) $request->integer('page', 1));

        $fetchScheduleTable = fn () => $this->paginatedScheduleTable($lease, $sort, $dir, $perPage, $page);

        return Inertia::render('leases/show', [
            'lease' => $this->transformForShow($lease),
            'scheduleFilters' => [
                'tab' => $tab,
                'sort' => $sort,
                'dir' => $dir,
                'per_page' => $perPage,
                'page' => $page,
            ],
            // Deferred (auto-fetched right after mount) when the Payment Schedule
            // tab is the one shown on this request; otherwise left optional until
            // the frontend explicitly requests it by switching to that tab.
            'scheduleTable' => $tab === 'schedule'
                ? Inertia::defer($fetchScheduleTable)
                : Inertia::optional($fetchScheduleTable),
        ]);
    }

    public function destroy(Request $request, Lease $lease): RedirectResponse
    {
        $lease->forceFill(['deleted_by' => $request->user()->id])->save();
        $lease->delete();

        return back();
    }

    public function restore(Lease $lease): RedirectResponse
    {
        $lease->restore();
        $lease->forceFill(['deleted_by' => null])->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => "Lease #{$lease->id} was restored."]);

        return back();
    }

    public function forceDelete(Lease $lease): RedirectResponse
    {
        $id = $lease->id;
        $lease->forceDelete();

        Inertia::flash('toast', ['type' => 'success', 'message' => "Lease #{$id} was permanently deleted."]);

        return back();
    }

    private function syncDocument(Request $request, Lease $lease): void
    {
        if ($request->hasFile('document')) {
            $lease->addMediaFromRequest('document')->toMediaCollection('document');
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function transform(Lease $lease, bool $withTrashMeta = false): array
    {
        $data = [
            'id' => $lease->id,
            'unit_name' => $lease->unit?->name,
            'property_name' => $lease->unit?->property?->name,
            'tenant_names' => $lease->tenants->pluck('name')->all(),
            'status' => $lease->status->value,
            'status_label' => $lease->status->label(),
            'start_date' => $lease->start_date->toDateString(),
            'end_date' => $lease->end_date->toDateString(),
            'rent_amount' => (string) $lease->rent_amount,
            'billing_period_label' => $lease->billing_period->label(),
        ];

        if ($withTrashMeta) {
            $data['deleted_at'] = $lease->deleted_at?->toIso8601String();
            $data['deleted_by_name'] = $lease->deletedBy?->name;
        }

        return $data;
    }

    /**
     * @return array<string, mixed>
     */
    private function transformForForm(Lease $lease): array
    {
        $document = $lease->getFirstMedia('document');

        return [
            'id' => $lease->id,
            'unit_id' => (string) $lease->unit_id,
            'unit_label' => $lease->unit !== null
                ? "{$lease->unit->name} — {$lease->unit->property?->name}"
                : null,
            'tenant_ids' => $lease->tenants->pluck('id')->all(),
            'start_date' => $lease->start_date->toDateString(),
            'end_date' => $lease->end_date->toDateString(),
            'rent_amount' => (string) $lease->rent_amount,
            'billing_period' => $lease->billing_period->value,
            'billing_day' => $lease->billing_day,
            'custom_interval_months' => $lease->custom_interval_months,
            'security_deposit' => $lease->security_deposit !== null ? (string) $lease->security_deposit : null,
            'status' => $lease->status->value,
            'notes' => $lease->notes,
            'document' => $document ? [
                'name' => $document->file_name,
                'url' => $document->getUrl(),
            ] : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformForShow(Lease $lease): array
    {
        $document = $lease->getFirstMedia('document');
        $completedPayments = $lease->payments->where('status', PaymentStatus::Completed);

        return [
            'id' => $lease->id,
            'unit' => $lease->unit !== null ? [
                'id' => $lease->unit->id,
                'name' => $lease->unit->name,
                'property_name' => $lease->unit->property?->name,
            ] : null,
            'tenants' => $lease->tenants->map(fn (Tenant $tenant) => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'email' => $tenant->email,
                'phone' => $tenant->phone,
            ])->all(),
            'start_date' => $lease->start_date->toDateString(),
            'end_date' => $lease->end_date->toDateString(),
            'rent_amount' => (string) $lease->rent_amount,
            'billing_period_label' => $lease->billing_period->label(),
            'billing_day' => $lease->billing_day,
            'security_deposit' => $lease->security_deposit !== null ? (string) $lease->security_deposit : null,
            'status' => $lease->status->value,
            'status_label' => $lease->status->label(),
            'notes' => $lease->notes,
            'document' => $document ? [
                'name' => $document->file_name,
                'url' => $document->getUrl(),
            ] : null,
            'payments' => $lease->payments->map(fn (Payment $payment): array => [
                'id' => $payment->id,
                'amount' => (string) $payment->amount,
                'payment_date' => $payment->payment_date->toDateString(),
                'method_label' => $payment->method->label(),
                'status' => $payment->status->value,
                'status_label' => $payment->status->label(),
                'reference' => $payment->reference,
            ])->all(),
            'payments_summary' => [
                'total_collected' => (string) $completedPayments->sum('amount'),
                'payments_count' => $completedPayments->count(),
            ],
            'created_at' => $lease->created_at?->toIso8601String(),
        ];
    }

    /**
     * @param  'asc'|'desc'  $dir
     * @return array{data: array<int, array<string, mixed>>, meta: array<string, mixed>}
     */
    private function paginatedScheduleTable(Lease $lease, string $sort, string $dir, int $perPage, int $page): array
    {
        $query = $lease->paymentSchedules()->withSum(
            ['payments as paid_amount' => fn (Builder $q) => $q->where('status', PaymentStatus::Completed)],
            'amount',
        );

        $sortColumn = match ($sort) {
            'status' => 'status',
            'amount_expected' => 'amount_expected',
            default => 'period_start',
        };
        $query->orderBy($sortColumn, $dir)->orderBy('id', $dir);

        $paginator = $query->paginate($perPage, page: $page);
        $today = now()->startOfDay();

        return [
            'data' => $paginator->getCollection()->map(fn (PaymentSchedule $schedule): array => [
                'id' => $schedule->id,
                'period_start' => $schedule->period_start->toDateString(),
                'period_end' => $schedule->period_end->toDateString(),
                'amount_expected' => (string) $schedule->amount_expected,
                'amount_paid' => number_format((float) ($schedule->paid_amount ?? 0), 2, '.', ''),
                'status' => $schedule->status->value,
                'status_label' => $schedule->status->label(),
                'is_overdue' => in_array($schedule->status, [PaymentScheduleStatus::Pending, PaymentScheduleStatus::Partial], true)
                    && $schedule->period_start->lessThan($today),
            ])->all(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
            ],
        ];
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function unitOptions(): array
    {
        return Unit::query()->with('property')->orderBy('name')->get()
            ->map(fn (Unit $unit) => [
                'value' => (string) $unit->id,
                'label' => "{$unit->name} — {$unit->property?->name} ({$unit->status->label()})",
            ])
            ->all();
    }

    /**
     * @return array<int, array{value: int, label: string}>
     */
    private function tenantOptions(): array
    {
        return Tenant::query()->orderBy('name')->get()
            ->map(fn (Tenant $tenant) => ['value' => $tenant->id, 'label' => $tenant->name])
            ->all();
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function statusOptions(): array
    {
        return array_map(
            fn (LeaseStatus $status) => ['value' => $status->value, 'label' => $status->label()],
            LeaseStatus::cases(),
        );
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function billingPeriodOptions(): array
    {
        return array_map(
            fn (BillingPeriod $period) => ['value' => $period->value, 'label' => $period->label()],
            BillingPeriod::cases(),
        );
    }
}
