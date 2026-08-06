<?php

namespace App\Http\Controllers;

use App\Enums\CategoryType;
use App\Models\Amenity;
use App\Models\Category;
use App\Models\UnitType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The tabbed "Extras" settings area — a read list per section (Expense /
 * Income / Document categories, Property features, Unit types). Mutations
 * live in CategoryController / AmenityController / UnitTypeController; this
 * controller only renders the list each tab shows.
 */
class ExtrasController extends Controller
{
    private const array SECTIONS = [
        'expense-categories',
        'income-categories',
        'document-categories',
        'property-features',
        'unit-types',
    ];

    public function index(Request $request, string $section): Response
    {
        abort_unless(in_array($section, self::SECTIONS, true), 404);

        $tab = $request->string('tab', 'active')->value() === 'trash' ? 'trash' : 'active';
        $search = $request->string('search')->trim()->value();
        $perPage = (int) $request->integer('per_page', 10);
        $perPage = in_array($perPage, [10, 25, 50], true) ? $perPage : 10;

        [$paginator, $counts] = match ($section) {
            'expense-categories' => $this->categoryList(CategoryType::Expense, $tab, $search, $perPage),
            'income-categories' => $this->categoryList(CategoryType::Income, $tab, $search, $perPage),
            'document-categories' => $this->categoryList(CategoryType::Document, $tab, $search, $perPage),
            'property-features' => $this->amenityList($tab, $search, $perPage),
            'unit-types' => $this->unitTypeList($tab, $search, $perPage),
        };

        return Inertia::render('extras/index', [
            'section' => $section,
            'items' => [
                'data' => $paginator['data'],
                'meta' => $paginator['meta'],
            ],
            'counts' => $counts,
            'filters' => [
                'tab' => $tab,
                'search' => $search,
                'per_page' => $perPage,
            ],
        ]);
    }

    /**
     * @return array{0: array{data: array<int, array<string, mixed>>, meta: array<string, mixed>}, 1: array{active: int, trash: int}}
     */
    private function categoryList(CategoryType $type, string $tab, string $search, int $perPage): array
    {
        $base = fn () => Category::query()->ofType($type);

        $query = $tab === 'trash' ? $base()->onlyTrashed()->with('deletedBy') : $base();
        $relation = $type === CategoryType::Document ? 'documents' : 'transactions';
        $query->withCount($relation);

        if ($search !== '') {
            $query->where('name', 'like', "%{$search}%");
        }

        $paginator = $query->orderBy('name')->paginate($perPage)->withQueryString();

        return [
            [
                'data' => $paginator->getCollection()->map(fn (Category $category) => [
                    'id' => $category->id,
                    'name' => $category->name,
                    'usage_count' => $category->{"{$relation}_count"},
                    'deleted_at' => $tab === 'trash' ? $category->deleted_at?->toIso8601String() : null,
                    'deleted_by_name' => $tab === 'trash' ? $category->deletedBy?->name : null,
                ])->all(),
                'meta' => $this->meta($paginator),
            ],
            [
                'active' => $base()->count(),
                'trash' => $base()->onlyTrashed()->count(),
            ],
        ];
    }

    /**
     * @return array{0: array{data: array<int, array<string, mixed>>, meta: array<string, mixed>}, 1: array{active: int, trash: int}}
     */
    private function amenityList(string $tab, string $search, int $perPage): array
    {
        $query = $tab === 'trash'
            ? Amenity::onlyTrashed()->with('deletedBy')
            : Amenity::query();

        $query->withCount('properties');

        if ($search !== '') {
            $query->where('name', 'like', "%{$search}%");
        }

        $paginator = $query->orderBy('name')->paginate($perPage)->withQueryString();

        return [
            [
                'data' => $paginator->getCollection()->map(fn (Amenity $amenity) => [
                    'id' => $amenity->id,
                    'name' => $amenity->name,
                    'usage_count' => $amenity->properties_count,
                    'deleted_at' => $tab === 'trash' ? $amenity->deleted_at?->toIso8601String() : null,
                    'deleted_by_name' => $tab === 'trash' ? $amenity->deletedBy?->name : null,
                ])->all(),
                'meta' => $this->meta($paginator),
            ],
            [
                'active' => Amenity::count(),
                'trash' => Amenity::onlyTrashed()->count(),
            ],
        ];
    }

    /**
     * @return array{0: array{data: array<int, array<string, mixed>>, meta: array<string, mixed>}, 1: array{active: int, trash: int}}
     */
    private function unitTypeList(string $tab, string $search, int $perPage): array
    {
        $query = $tab === 'trash'
            ? UnitType::onlyTrashed()->with('deletedBy')
            : UnitType::query();

        $query->withCount('units');

        if ($search !== '') {
            $query->where(fn (Builder $q) => $q->where('name', 'like', "%{$search}%")
                ->orWhere('label', 'like', "%{$search}%"));
        }

        $paginator = $query->orderBy('label')->paginate($perPage)->withQueryString();

        return [
            [
                'data' => $paginator->getCollection()->map(fn (UnitType $unitType) => [
                    'id' => $unitType->id,
                    'name' => $unitType->name,
                    'label' => $unitType->label,
                    'usage_count' => $unitType->units_count,
                    'deleted_at' => $tab === 'trash' ? $unitType->deleted_at?->toIso8601String() : null,
                    'deleted_by_name' => $tab === 'trash' ? $unitType->deletedBy?->name : null,
                ])->all(),
                'meta' => $this->meta($paginator),
            ],
            [
                'active' => UnitType::count(),
                'trash' => UnitType::onlyTrashed()->count(),
            ],
        ];
    }

    /**
     * @param  \Illuminate\Contracts\Pagination\LengthAwarePaginator<int, \Illuminate\Database\Eloquent\Model>  $paginator
     * @return array<string, int|null>
     */
    private function meta($paginator): array
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
