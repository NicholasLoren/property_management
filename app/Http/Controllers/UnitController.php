<?php

namespace App\Http\Controllers;

use App\Enums\BillingPeriod;
use App\Enums\UnitStatus;
use App\Http\Requests\Units\StoreUnitRequest;
use App\Http\Requests\Units\UpdateUnitRequest;
use App\Models\Property;
use App\Models\Unit;
use App\Models\UnitFeature;
use App\Models\UnitPrice;
use App\Models\UnitType;
use App\Services\CodeGenerator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class UnitController extends Controller
{
    public function __construct(private readonly CodeGenerator $codes) {}

    public function index(Request $request, Property $property): Response
    {
        $filters = $this->parseFilters($request);
        $sort = $request->string('sort', 'name')->value();
        $dir = $request->string('dir', 'asc')->value() === 'desc' ? 'desc' : 'asc';
        $perPage = (int) $request->integer('per_page', 10);
        $perPage = in_array($perPage, [10, 25, 50], true) ? $perPage : 10;

        $query = $this->filteredQuery($property, $filters);

        $sortColumn = $sort === 'status' ? 'status' : 'name';
        $query->orderBy($sortColumn, $dir)->orderBy('id');

        $paginator = $query->paginate($perPage)->withQueryString();

        return Inertia::render('units/index', [
            'property' => [
                'id' => $property->id,
                'name' => $property->name,
            ],
            'units' => [
                'data' => $paginator->getCollection()
                    ->map(fn (Unit $unit) => $this->transform($unit, $filters['tab'] === 'trash'))
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
                'active' => $property->units()->count(),
                'trash' => $property->units()->onlyTrashed()->count(),
            ],
            'statuses' => $this->statusOptions(),
        ]);
    }

    /**
     * A cross-property listing (the "Units" sidebar entry) — unlike index(),
     * which is scoped to one property's URL, this browses every unit in
     * the portfolio at once, with a Property column/filter.
     */
    public function allIndex(Request $request): Response
    {
        $filters = $this->parseFilters($request);
        $sort = $request->string('sort', 'name')->value();
        $dir = $request->string('dir', 'asc')->value() === 'desc' ? 'desc' : 'asc';
        $perPage = (int) $request->integer('per_page', 10);
        $perPage = in_array($perPage, [10, 25, 50], true) ? $perPage : 10;
        $propertyIds = array_values(array_filter((array) $request->input('property_id', [])));

        $query = $filters['tab'] === 'trash'
            ? Unit::onlyTrashed()->with('deletedBy')
            : Unit::query();

        $query->with(['unitType', 'property'])->withCount('features');

        if ($filters['search'] !== '') {
            $query->where(fn (Builder $q) => $q->where('name', 'like', "%{$filters['search']}%")
                ->orWhere('code', 'like', "%{$filters['search']}%")
                ->orWhereHas('property', fn (Builder $p) => $p->where('name', 'like', "%{$filters['search']}%")));
        }

        if ($filters['tab'] !== 'trash') {
            if ($filters['statuses'] !== []) {
                $query->whereIn('status', $filters['statuses']);
            }

            if ($propertyIds !== []) {
                $query->whereIn('property_id', $propertyIds);
            }
        }

        if ($sort === 'property') {
            $query->join('properties', 'properties.id', '=', 'units.property_id')
                ->select('units.*')
                ->orderBy('properties.name', $dir);
        } else {
            $sortColumn = $sort === 'status' ? 'status' : 'name';
            $query->orderBy($sortColumn, $dir);
        }

        $query->orderBy('units.id');

        $paginator = $query->paginate($perPage)->withQueryString();

        return Inertia::render('units/all', [
            'units' => [
                'data' => $paginator->getCollection()
                    ->map(fn (Unit $unit) => $this->transform($unit, $filters['tab'] === 'trash', withProperty: true))
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
                'property_id' => $propertyIds,
                'sort' => $sort,
                'dir' => $dir,
                'per_page' => $perPage,
                'tab' => $filters['tab'],
            ],
            'counts' => [
                'active' => Unit::count(),
                'trash' => Unit::onlyTrashed()->count(),
            ],
            'statuses' => $this->statusOptions(),
            'properties' => Property::query()->orderBy('name')->get()
                ->map(fn (Property $property) => ['value' => (string) $property->id, 'label' => $property->name])
                ->all(),
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
                array_column(UnitStatus::cases(), 'value'),
            )),
        ];
    }

    /**
     * @param  array{tab: string, search: string, statuses: array<int, string>}  $filters
     * @return HasMany<Unit, Property>
     */
    private function filteredQuery(Property $property, array $filters): HasMany
    {
        $query = $filters['tab'] === 'trash'
            ? $property->units()->onlyTrashed()->with('deletedBy')
            : $property->units();

        $query->with('unitType')->withCount('features');

        if ($filters['search'] !== '') {
            $query->where(fn (Builder $q) => $q->where('name', 'like', "%{$filters['search']}%")
                ->orWhere('code', 'like', "%{$filters['search']}%"));
        }

        if ($filters['tab'] !== 'trash' && $filters['statuses'] !== []) {
            $query->whereIn('status', $filters['statuses']);
        }

        return $query;
    }

    public function create(Property $property): Response
    {
        return Inertia::render('units/form', [
            'property' => ['id' => $property->id, 'name' => $property->name],
            'unitTypes' => $this->unitTypeOptions(),
            'features' => $this->featureOptions(),
            'statuses' => $this->statusOptions(),
            'billingPeriods' => $this->billingPeriodOptions(),
        ]);
    }

    public function store(StoreUnitRequest $request, Property $property): RedirectResponse
    {
        $unit = $property->units()->create([
            'code' => $this->codes->generate('unit'),
            'unit_type_id' => $request->validated('unit_type_id'),
            'name' => $request->validated('name'),
            'size' => $request->validated('size'),
            'status' => $request->validated('status'),
        ]);

        if ($this->codes->usesId('unit')) {
            $unit->forceFill(['code' => $this->codes->generate('unit', $unit)])->save();
        }

        $this->syncFeatures($request, $unit);
        $this->syncPrice($request, $unit);
        $this->syncPhotos($request, $unit);

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$unit->name} was added."]);

        return to_route('units.index', $property);
    }

    public function edit(Property $property, Unit $unit): Response
    {
        $unit->load(['features', 'media', 'currentPrice']);

        return Inertia::render('units/form', [
            'property' => ['id' => $property->id, 'name' => $property->name],
            'unit' => $this->transformForForm($unit),
            'unitTypes' => $this->unitTypeOptions(),
            'features' => $this->featureOptions(),
            'statuses' => $this->statusOptions(),
            'billingPeriods' => $this->billingPeriodOptions(),
        ]);
    }

    public function show(Property $property, Unit $unit): Response
    {
        $unit->load(['unitType', 'features', 'media', 'prices' => fn ($query) => $query->orderByDesc('effective_from')]);

        return Inertia::render('units/show', [
            'property' => ['id' => $property->id, 'name' => $property->name],
            'unit' => $this->transformForShow($unit),
        ]);
    }

    public function update(UpdateUnitRequest $request, Property $property, Unit $unit): RedirectResponse
    {
        $unit->update([
            'unit_type_id' => $request->validated('unit_type_id'),
            'name' => $request->validated('name'),
            'size' => $request->validated('size'),
            'status' => $request->validated('status'),
        ]);

        $this->syncFeatures($request, $unit);
        $this->syncPrice($request, $unit);

        foreach ($request->validated('remove_photo_ids', []) as $mediaId) {
            $unit->media()->where('id', $mediaId)->first()?->delete();
        }

        $this->syncPhotos($request, $unit);

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$unit->name} was updated."]);

        return to_route('units.index', $property);
    }

    public function destroy(Request $request, Property $property, Unit $unit): RedirectResponse
    {
        $unit->forceFill(['deleted_by' => $request->user()->id])->save();
        $unit->delete();

        return back();
    }

    public function restore(Property $property, Unit $unit): RedirectResponse
    {
        $unit->restore();
        $unit->forceFill(['deleted_by' => null])->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$unit->name} was restored."]);

        return back();
    }

    public function forceDelete(Property $property, Unit $unit): RedirectResponse
    {
        $name = $unit->name;
        $unit->forceDelete();

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$name} was permanently deleted."]);

        return back();
    }

    private function syncFeatures(Request $request, Unit $unit): void
    {
        /** @var array<int, array{unit_feature_id?: mixed, quantity?: mixed}> $input */
        $input = $request->input('features', []);

        $features = collect($input)
            ->filter(fn (array $feature) => filled($feature['unit_feature_id'] ?? null))
            ->mapWithKeys(fn (array $feature) => [
                (int) $feature['unit_feature_id'] => ['quantity' => (int) ($feature['quantity'] ?? 1)],
            ])
            ->all();

        $unit->features()->sync($features);
    }

    private function syncPrice(Request $request, Unit $unit): void
    {
        $amount = $request->input('price_amount');
        $billingPeriod = $request->input('price_billing_period');

        if ($amount === null || $billingPeriod === null) {
            return;
        }

        $current = $unit->currentPrice;

        if ($current !== null
            && round((float) $current->amount, 2) === round((float) $amount, 2)
            && $current->billing_period->value === $billingPeriod) {
            return;
        }

        $current?->update(['effective_to' => now()->toDateString()]);

        $unit->prices()->create([
            'amount' => $amount,
            'billing_period' => $billingPeriod,
            'effective_from' => now()->toDateString(),
            'created_by' => $request->user()->id,
        ]);
    }

    private function syncPhotos(Request $request, Unit $unit): void
    {
        if (! $request->hasFile('photos')) {
            return;
        }

        $unit->addMultipleMediaFromRequest(['photos'])
            ->each(fn ($adder) => $adder->toMediaCollection('photos'));
    }

    /**
     * @return array<string, mixed>
     */
    private function transform(Unit $unit, bool $withTrashMeta = false, bool $withProperty = false): array
    {
        $currentPrice = $unit->currentPrice;

        $data = [
            'id' => $unit->id,
            'code' => $unit->code,
            'name' => $unit->name,
            'unit_type_label' => $unit->unitType?->label,
            'size' => $unit->size,
            'status' => $unit->status->value,
            'status_label' => $unit->status->label(),
            'current_price' => $currentPrice !== null ? [
                'amount' => (string) $currentPrice->amount,
                'billing_period_label' => $currentPrice->billing_period->label(),
            ] : null,
            'features_count' => $unit->features_count,
            'photo_url' => $unit->getFirstMediaUrl('photos') ?: null,
            'created_at' => $unit->created_at?->toIso8601String(),
        ];

        if ($withProperty) {
            $data['property'] = $unit->property !== null ? [
                'id' => $unit->property->id,
                'name' => $unit->property->name,
            ] : null;
        }

        if ($withTrashMeta) {
            $data['deleted_at'] = $unit->deleted_at?->toIso8601String();
            $data['deleted_by_name'] = $unit->deletedBy?->name;
        }

        return $data;
    }

    /**
     * @return array<string, mixed>
     */
    private function transformForForm(Unit $unit): array
    {
        $currentPrice = $unit->currentPrice;

        return [
            'id' => $unit->id,
            'unit_type_id' => $unit->unit_type_id !== null ? (string) $unit->unit_type_id : null,
            'name' => $unit->name,
            'size' => $unit->size,
            'status' => $unit->status->value,
            'price_amount' => $currentPrice?->amount !== null ? (string) $currentPrice->amount : null,
            'price_billing_period' => $currentPrice?->billing_period->value,
            'features' => $unit->features->map(fn (UnitFeature $feature): array => [
                'unit_feature_id' => $feature->id,
                'quantity' => $feature->pivot->quantity,
            ])->all(),
            'photos' => $unit->media->map(fn (Media $media): array => [
                'id' => $media->id,
                'name' => $media->file_name,
                'url' => $media->getUrl(),
            ])->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformForShow(Unit $unit): array
    {
        return [
            'id' => $unit->id,
            'code' => $unit->code,
            'name' => $unit->name,
            'unit_type_label' => $unit->unitType?->label,
            'size' => $unit->size,
            'status' => $unit->status->value,
            'status_label' => $unit->status->label(),
            'features' => $unit->features->map(fn (UnitFeature $feature): array => [
                'name' => $feature->name,
                'quantity' => $feature->pivot->quantity,
            ])->all(),
            'price_history' => $unit->prices->map(fn (UnitPrice $price): array => [
                'id' => $price->id,
                'amount' => (string) $price->amount,
                'billing_period_label' => $price->billing_period->label(),
                'effective_from' => $price->effective_from->toDateString(),
                'effective_to' => $price->effective_to?->toDateString(),
                'is_current' => $price->effective_to === null,
            ])->all(),
            'photos' => $unit->media->map(fn (Media $media): array => [
                'id' => $media->id,
                'name' => $media->file_name,
                'url' => $media->getUrl(),
            ])->all(),
            'created_at' => $unit->created_at?->toIso8601String(),
        ];
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function unitTypeOptions(): array
    {
        return UnitType::query()->orderBy('label')->get()
            ->map(fn (UnitType $type) => ['value' => (string) $type->id, 'label' => $type->label])
            ->all();
    }

    /**
     * @return array<int, array{value: int, label: string}>
     */
    private function featureOptions(): array
    {
        return UnitFeature::query()->orderBy('name')->get()
            ->map(fn (UnitFeature $feature) => ['value' => $feature->id, 'label' => $feature->name])
            ->all();
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function statusOptions(): array
    {
        return array_map(
            fn (UnitStatus $status) => ['value' => $status->value, 'label' => $status->label()],
            UnitStatus::cases(),
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
