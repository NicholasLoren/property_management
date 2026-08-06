<?php

namespace App\Http\Controllers;

use App\Enums\PropertyType;
use App\Enums\UnitStatus;
use App\Exports\PropertiesExport;
use App\Http\Requests\Properties\StorePropertyRequest;
use App\Http\Requests\Properties\UpdatePropertyRequest;
use App\Models\Amenity;
use App\Models\Property;
use App\Models\Unit;
use App\Models\User;
use App\Settings\BrandingSettings;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

class PropertyController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $this->parseFilters($request);
        $sort = $request->string('sort', 'name')->value();
        $dir = $request->string('dir', 'asc')->value() === 'desc' ? 'desc' : 'asc';
        $perPage = (int) $request->integer('per_page', 10);
        $perPage = in_array($perPage, [10, 25, 50], true) ? $perPage : 10;

        $query = $this->filteredQuery($filters);

        if ($sort === 'landlord') {
            $query->join('users as landlords', 'landlords.id', '=', 'properties.landlord_id')
                ->select('properties.*')
                ->orderBy('landlords.name', $dir);
        } else {
            $sortColumn = match ($sort) {
                'type' => 'type',
                'units' => 'units_count',
                default => 'name',
            };
            $query->orderBy($sortColumn, $dir);
        }

        $query->orderBy('properties.id');

        $paginator = $query->paginate($perPage)->withQueryString();

        return Inertia::render('properties/index', [
            'properties' => [
                'data' => $paginator->getCollection()
                    ->map(fn (Property $property) => $this->transform($property, $filters['tab'] === 'trash'))
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
                'type' => $filters['types'],
                'landlord_id' => $filters['landlordIds'],
                'sort' => $sort,
                'dir' => $dir,
                'per_page' => $perPage,
                'tab' => $filters['tab'],
            ],
            'counts' => [
                'active' => Property::count(),
                'trash' => Property::onlyTrashed()->count(),
            ],
            'landlords' => $this->landlordOptions(),
            'types' => $this->typeOptions(),
        ]);
    }

    public function export(Request $request, string $format, BrandingSettings $branding): HttpResponse
    {
        $query = $this->filteredQuery($this->parseFilters($request))->orderBy('name');
        $export = new PropertiesExport($query);

        return $format === 'excel'
            ? $export->download('properties.xlsx')
            : Pdf::loadView('exports.pdf-table', [
                'title' => 'Properties',
                'headings' => $export->headings(),
                'rows' => $query->get()->map($export->map(...)),
                'headerText' => $branding->pdf_header_text,
                'accentColor' => $branding->accent_color,
            ])->download('properties.pdf');
    }

    /**
     * @return array{tab: string, search: string, types: array<int, string>, landlordIds: array<int, string>}
     */
    private function parseFilters(Request $request): array
    {
        return [
            'tab' => $request->string('tab', 'active')->value() === 'trash' ? 'trash' : 'active',
            'search' => $request->string('search')->trim()->value(),
            'types' => array_values(array_intersect(
                (array) $request->input('type', []),
                array_column(PropertyType::cases(), 'value'),
            )),
            'landlordIds' => array_values(array_filter((array) $request->input('landlord_id', []))),
        ];
    }

    /**
     * @param  array{tab: string, search: string, types: array<int, string>, landlordIds: array<int, string>}  $filters
     * @return Builder<Property>
     */
    private function filteredQuery(array $filters): Builder
    {
        $query = $filters['tab'] === 'trash'
            ? Property::onlyTrashed()->with(['landlord', 'deletedBy'])
            : Property::query()->with('landlord');

        $query->withCount('units')->with('units.currentPrice');

        if ($filters['search'] !== '') {
            $query->where(fn ($q) => $q->where('name', 'like', "%{$filters['search']}%")
                ->orWhere('address', 'like', "%{$filters['search']}%"));
        }

        if ($filters['tab'] !== 'trash') {
            if ($filters['types'] !== []) {
                $query->whereIn('type', $filters['types']);
            }

            if ($filters['landlordIds'] !== []) {
                $query->whereIn('landlord_id', $filters['landlordIds']);
            }
        }

        return $query;
    }

    public function create(): Response
    {
        return Inertia::render('properties/form', [
            'landlords' => $this->landlordOptions(),
            'amenities' => $this->amenityOptions(),
            'types' => $this->typeOptions(),
        ]);
    }

    public function store(StorePropertyRequest $request): RedirectResponse
    {
        $property = Property::create([
            'landlord_id' => $request->validated('landlord_id'),
            'name' => $request->validated('name'),
            'type' => $request->validated('type'),
            'address' => $request->validated('address'),
            'latitude' => $request->validated('latitude'),
            'longitude' => $request->validated('longitude'),
            'description' => $request->validated('description'),
        ]);

        $property->amenities()->sync($request->validated('amenity_ids', []));
        $this->syncPhotos($request, $property);

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$property->name} was added."]);

        return to_route('properties.index');
    }

    public function edit(Property $property): Response
    {
        $property->load(['amenities', 'media']);

        return Inertia::render('properties/form', [
            'property' => $this->transformForForm($property),
            'landlords' => $this->landlordOptions(),
            'amenities' => $this->amenityOptions(),
            'types' => $this->typeOptions(),
        ]);
    }

    public function update(UpdatePropertyRequest $request, Property $property): RedirectResponse
    {
        $property->update([
            'landlord_id' => $request->validated('landlord_id'),
            'name' => $request->validated('name'),
            'type' => $request->validated('type'),
            'address' => $request->validated('address'),
            'latitude' => $request->validated('latitude'),
            'longitude' => $request->validated('longitude'),
            'description' => $request->validated('description'),
        ]);

        $property->amenities()->sync($request->validated('amenity_ids', []));

        foreach ($request->validated('remove_photo_ids', []) as $mediaId) {
            $property->media()->where('id', $mediaId)->first()?->delete();
        }

        $this->syncPhotos($request, $property);

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$property->name} was updated."]);

        return to_route('properties.index');
    }

    public function show(Property $property): Response
    {
        $property->load(['landlord', 'amenities', 'media', 'units.currentPrice', 'units.features']);

        return Inertia::render('properties/show', [
            'property' => $this->transformForShow($property),
        ]);
    }

    public function destroy(Request $request, Property $property): RedirectResponse
    {
        $property->units()->get()->each(function ($unit) use ($request): void {
            $unit->forceFill(['deleted_by' => $request->user()->id])->save();
            $unit->delete();
        });

        $property->forceFill(['deleted_by' => $request->user()->id])->save();
        $property->delete();

        // No flash toast here: the frontend shows an inline "Undo" toast
        // instead of a plain confirmation.
        return back();
    }

    public function restore(Property $property): RedirectResponse
    {
        $property->restore();
        $property->forceFill(['deleted_by' => null])->save();

        $property->units()->onlyTrashed()->get()->each(function ($unit): void {
            $unit->restore();
            $unit->forceFill(['deleted_by' => null])->save();
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$property->name} was restored."]);

        return back();
    }

    public function forceDelete(Property $property): RedirectResponse
    {
        $name = $property->name;
        $property->forceDelete();

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$name} was permanently deleted."]);

        return back();
    }

    private function syncPhotos(Request $request, Property $property): void
    {
        if (! $request->hasFile('photos')) {
            return;
        }

        $property->addMultipleMediaFromRequest(['photos'])
            ->each(fn ($adder) => $adder->toMediaCollection('photos'));
    }

    /**
     * @return array<string, mixed>
     */
    private function transform(Property $property, bool $withTrashMeta = false): array
    {
        $units = $property->units;

        $data = [
            'id' => $property->id,
            'name' => $property->name,
            'type' => $property->type->value,
            'type_label' => $property->type->label(),
            'address' => $property->address,
            'landlord_id' => $property->landlord_id,
            'landlord_name' => $property->landlord?->name,
            'units_count' => $property->units_count,
            'units_summary' => $this->unitsSummary($units),
            'price_range' => $this->priceRange($units),
            'photo_url' => $property->getFirstMediaUrl('photos') ?: null,
            'created_at' => $property->created_at?->toIso8601String(),
        ];

        if ($withTrashMeta) {
            $data['deleted_at'] = $property->deleted_at?->toIso8601String();
            $data['deleted_by_name'] = $property->deletedBy?->name;
        }

        return $data;
    }

    /**
     * @return array<string, mixed>
     */
    private function transformForForm(Property $property): array
    {
        return [
            'id' => $property->id,
            'landlord_id' => (string) $property->landlord_id,
            'name' => $property->name,
            'type' => $property->type->value,
            'address' => $property->address,
            'latitude' => $property->latitude !== null ? (float) $property->latitude : null,
            'longitude' => $property->longitude !== null ? (float) $property->longitude : null,
            'description' => $property->description,
            'amenity_ids' => $property->amenities->pluck('id')->all(),
            'photos' => $property->media->map(fn (Media $media): array => [
                'id' => $media->id,
                'name' => $media->file_name,
                'url' => $media->getUrl(),
            ])->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformForShow(Property $property): array
    {
        $units = $property->units;

        return [
            'id' => $property->id,
            'name' => $property->name,
            'type' => $property->type->value,
            'type_label' => $property->type->label(),
            'address' => $property->address,
            'latitude' => $property->latitude !== null ? (float) $property->latitude : null,
            'longitude' => $property->longitude !== null ? (float) $property->longitude : null,
            'description' => $property->description,
            'landlord' => $property->landlord !== null ? [
                'id' => $property->landlord->id,
                'name' => $property->landlord->name,
                'email' => $property->landlord->email,
            ] : null,
            'amenities' => $property->amenities->pluck('name')->all(),
            'photos' => $property->media->map(fn (Media $media): array => [
                'id' => $media->id,
                'name' => $media->file_name,
                'url' => $media->getUrl(),
            ])->all(),
            'units_count' => $units->count(),
            'units' => $units->map(fn (Unit $unit): array => [
                'id' => $unit->id,
                'name' => $unit->name,
            ])->all(),
            'quick_facts' => [
                ...$this->unitsSummary($units),
                'bedrooms' => $this->featureTotal($units, 'Bedroom'),
                'bathrooms' => $this->featureTotal($units, 'Bathroom'),
            ],
            'price_summary' => $this->priceSummary($units),
            'created_at' => $property->created_at?->toIso8601String(),
        ];
    }

    /**
     * @param  Collection<int, Unit>  $units
     * @return array{total: int, vacant: int, occupied: int}
     */
    private function unitsSummary(Collection $units): array
    {
        return [
            'total' => $units->count(),
            'vacant' => $units->filter(fn (Unit $unit) => $unit->status === UnitStatus::Vacant)->count(),
            'occupied' => $units->filter(fn (Unit $unit) => $unit->status === UnitStatus::Occupied)->count(),
        ];
    }

    /**
     * @param  Collection<int, Unit>  $units
     * @return array{low: string|null, high: string|null}
     */
    private function priceRange(Collection $units): array
    {
        $amounts = $units->map(fn (Unit $unit) => $unit->currentPrice?->amount)
            ->filter(fn (?string $amount) => $amount !== null)
            ->map(fn (string $amount) => (float) $amount)
            ->sort()
            ->values();

        if ($amounts->isEmpty()) {
            return ['low' => null, 'high' => null];
        }

        return [
            'low' => (string) $amounts->first(),
            'high' => (string) $amounts->last(),
        ];
    }

    /**
     * @param  Collection<int, Unit>  $units
     * @return array{low: string|null, median: string|null, high: string|null, billing_period_label: string|null}
     */
    private function priceSummary(Collection $units): array
    {
        $pricedUnits = $units->filter(fn (Unit $unit) => $unit->currentPrice !== null);

        if ($pricedUnits->isEmpty()) {
            return ['low' => null, 'median' => null, 'high' => null, 'billing_period_label' => null];
        }

        $amounts = $pricedUnits->map(fn (Unit $unit) => (float) $unit->currentPrice->amount)->sort()->values();
        $periods = $pricedUnits->map(fn (Unit $unit) => $unit->currentPrice->billing_period->value)->unique();
        $middle = intdiv($amounts->count(), 2);
        $median = $amounts->count() % 2 === 0
            ? ($amounts[$middle - 1] + $amounts[$middle]) / 2
            : $amounts[$middle];

        return [
            'low' => (string) $amounts->first(),
            'median' => (string) $median,
            'high' => (string) $amounts->last(),
            'billing_period_label' => $periods->count() === 1 ? $pricedUnits->first()->currentPrice->billing_period->label() : null,
        ];
    }

    /**
     * @param  Collection<int, Unit>  $units
     */
    private function featureTotal(Collection $units, string $featureName): ?int
    {
        $total = $units->sum(fn (Unit $unit) => $unit->features
            ->firstWhere('name', $featureName)?->pivot->quantity ?? 0);

        return $total > 0 ? $total : null;
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function landlordOptions(): array
    {
        return User::role('Landlord')->orderBy('name')->get()
            ->map(fn (User $user) => ['value' => (string) $user->id, 'label' => $user->name])
            ->all();
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function amenityOptions(): array
    {
        return Amenity::query()->orderBy('name')->get()
            ->map(fn (Amenity $amenity) => ['value' => (string) $amenity->id, 'label' => $amenity->name])
            ->all();
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function typeOptions(): array
    {
        return array_map(
            fn (PropertyType $type) => ['value' => $type->value, 'label' => $type->label()],
            PropertyType::cases(),
        );
    }
}
