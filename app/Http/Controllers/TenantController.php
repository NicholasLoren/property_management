<?php

namespace App\Http\Controllers;

use App\Enums\LeaseStatus;
use App\Http\Requests\Tenants\StoreTenantRequest;
use App\Http\Requests\Tenants\UpdateTenantRequest;
use App\Models\Lease;
use App\Models\Tenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TenantController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $this->parseFilters($request);
        $dir = $request->string('dir', 'asc')->value() === 'desc' ? 'desc' : 'asc';
        $perPage = (int) $request->integer('per_page', 10);
        $perPage = in_array($perPage, [10, 25, 50], true) ? $perPage : 10;

        $query = $filters['tab'] === 'trash'
            ? Tenant::onlyTrashed()->with('deletedBy')
            : Tenant::query();

        $query->with(['leases' => fn ($q) => $q->where('status', LeaseStatus::Active->value)->with('unit.property')]);

        if ($filters['search'] !== '') {
            $query->where(fn ($q) => $q->where('name', 'like', "%{$filters['search']}%")
                ->orWhere('email', 'like', "%{$filters['search']}%")
                ->orWhere('phone', 'like', "%{$filters['search']}%"));
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
            ],
            'counts' => [
                'active' => Tenant::count(),
                'trash' => Tenant::onlyTrashed()->count(),
            ],
        ]);
    }

    /**
     * @return array{tab: string, search: string}
     */
    private function parseFilters(Request $request): array
    {
        return [
            'tab' => $request->string('tab', 'active')->value() === 'trash' ? 'trash' : 'active',
            'search' => $request->string('search')->trim()->value(),
        ];
    }

    public function create(): Response
    {
        return Inertia::render('tenants/form');
    }

    public function store(StoreTenantRequest $request): RedirectResponse
    {
        $tenant = Tenant::create([
            'name' => $request->validated('name'),
            'email' => $request->validated('email'),
            'phone' => $request->validated('phone'),
            'id_number' => $request->validated('id_number'),
            'address' => $request->validated('address'),
            'notes' => $request->validated('notes'),
        ]);

        $this->syncIdDocument($request, $tenant);

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$tenant->name} was added."]);

        return to_route('tenants.index');
    }

    public function edit(Tenant $tenant): Response
    {
        $tenant->load('media');

        return Inertia::render('tenants/form', [
            'tenant' => $this->transformForForm($tenant),
        ]);
    }

    public function update(UpdateTenantRequest $request, Tenant $tenant): RedirectResponse
    {
        $tenant->update([
            'name' => $request->validated('name'),
            'email' => $request->validated('email'),
            'phone' => $request->validated('phone'),
            'id_number' => $request->validated('id_number'),
            'address' => $request->validated('address'),
            'notes' => $request->validated('notes'),
        ]);

        $this->syncIdDocument($request, $tenant);

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$tenant->name} was updated."]);

        return to_route('tenants.index');
    }

    public function show(Tenant $tenant): Response
    {
        $tenant->load(['media', 'leases.unit.property']);

        return Inertia::render('tenants/show', [
            'tenant' => $this->transformForShow($tenant),
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

    /**
     * @return array<string, mixed>
     */
    private function transform(Tenant $tenant, bool $withTrashMeta = false): array
    {
        $activeLease = $tenant->leases->first();

        $data = [
            'id' => $tenant->id,
            'name' => $tenant->name,
            'email' => $tenant->email,
            'phone' => $tenant->phone,
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

        return [
            'id' => $tenant->id,
            'name' => $tenant->name,
            'email' => $tenant->email,
            'phone' => $tenant->phone,
            'id_number' => $tenant->id_number,
            'address' => $tenant->address,
            'notes' => $tenant->notes,
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

        return [
            'id' => $tenant->id,
            'name' => $tenant->name,
            'email' => $tenant->email,
            'phone' => $tenant->phone,
            'id_number' => $tenant->id_number,
            'address' => $tenant->address,
            'notes' => $tenant->notes,
            'id_document' => $document ? [
                'name' => $document->file_name,
                'url' => $document->getUrl(),
            ] : null,
            'leases' => $tenant->leases->map(fn (Lease $lease) => [
                'id' => $lease->id,
                'unit_name' => $lease->unit?->name,
                'property_name' => $lease->unit?->property?->name,
                'status' => $lease->status->value,
                'status_label' => $lease->status->label(),
                'start_date' => $lease->start_date->toDateString(),
                'end_date' => $lease->end_date->toDateString(),
                'rent_amount' => (string) $lease->rent_amount,
            ])->all(),
            'created_at' => $tenant->created_at?->toIso8601String(),
        ];
    }
}
