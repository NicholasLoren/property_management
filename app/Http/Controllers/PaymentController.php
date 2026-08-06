<?php

namespace App\Http\Controllers;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Http\Requests\Payments\StorePaymentRequest;
use App\Http\Requests\Payments\UpdatePaymentRequest;
use App\Models\Lease;
use App\Models\Payment;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PaymentController extends Controller
{
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
            $query->where(fn (Builder $q) => $q->whereHas('tenant', fn (Builder $t) => $t->where('name', 'like', "%{$filters['search']}%"))
                ->orWhereHas('lease.unit', fn (Builder $u) => $u->where('name', 'like', "%{$filters['search']}%"))
                ->orWhereHas('lease.unit.property', fn (Builder $p) => $p->where('name', 'like', "%{$filters['search']}%")));
        }

        if ($filters['tab'] !== 'trash' && $filters['statuses'] !== []) {
            $query->whereIn('status', $filters['statuses']);
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
            ],
            'counts' => [
                'active' => Payment::count(),
                'trash' => Payment::onlyTrashed()->count(),
            ],
            'total_collected' => (string) Payment::where('status', PaymentStatus::Completed->value)->sum('amount'),
            'statuses' => $this->statusOptions(),
        ]);
    }

    /**
     * @return array{tab: string, search: string, statuses: array<int, string>}
     */
    private function parseFilters(Request $request): array
    {
        return [
            'tab' => $request->string('tab', 'active')->value() === 'trash' ? 'trash' : 'active',
            'search' => $request->string('search')->trim()->value(),
            'statuses' => array_values(array_intersect(
                (array) $request->input('status', []),
                array_column(PaymentStatus::cases(), 'value'),
            )),
        ];
    }

    public function create(): Response
    {
        return Inertia::render('payments/form', [
            'leases' => $this->leaseOptions(),
            'methods' => $this->methodOptions(),
            'statuses' => $this->statusOptions(),
        ]);
    }

    public function store(StorePaymentRequest $request): RedirectResponse
    {
        $payment = Payment::create([
            'lease_id' => $request->validated('lease_id'),
            'tenant_id' => $request->validated('tenant_id'),
            'amount' => $request->validated('amount'),
            'payment_date' => $request->validated('payment_date'),
            'method' => $request->validated('method'),
            'status' => $request->validated('status'),
            'reference' => $request->validated('reference'),
            'notes' => $request->validated('notes'),
            'created_by' => $request->user()->id,
        ]);

        $this->syncReceipt($request, $payment);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Payment was recorded.']);

        return to_route('payments.index');
    }

    public function edit(Payment $payment): Response
    {
        $payment->load(['lease.unit.property', 'lease.tenants', 'media']);

        return Inertia::render('payments/form', [
            'payment' => $this->transformForForm($payment),
            'leases' => $this->leaseOptions(),
            'methods' => $this->methodOptions(),
            'statuses' => $this->statusOptions(),
        ]);
    }

    public function update(UpdatePaymentRequest $request, Payment $payment): RedirectResponse
    {
        $payment->update([
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

        $this->syncReceipt($request, $payment);

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
    private function transformForForm(Payment $payment): array
    {
        $receipt = $payment->getFirstMedia('receipt');

        return [
            'id' => $payment->id,
            'lease_id' => (string) $payment->lease_id,
            'lease_label' => $payment->lease !== null
                ? "{$payment->lease->unit?->name} — {$payment->lease->unit?->property?->name}"
                : null,
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
     * @return array<int, array{value: string, label: string, tenants: array<int, array{value: string, label: string}>}>
     */
    private function leaseOptions(): array
    {
        return Lease::query()->with(['unit.property', 'tenants'])->orderByDesc('start_date')->get()
            ->map(fn (Lease $lease) => [
                'value' => (string) $lease->id,
                'label' => "{$lease->unit?->name} — {$lease->unit?->property?->name}",
                'tenants' => $lease->tenants->map(fn (Tenant $tenant) => [
                    'value' => (string) $tenant->id,
                    'label' => $tenant->name,
                ])->all(),
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
