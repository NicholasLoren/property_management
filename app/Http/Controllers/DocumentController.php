<?php

namespace App\Http\Controllers;

use App\Enums\CategoryType;
use App\Http\Requests\Documents\StoreDocumentRequest;
use App\Http\Requests\Documents\UpdateDocumentRequest;
use App\Models\Category;
use App\Models\Document;
use App\Models\Lease;
use App\Models\Property;
use App\Models\Tenant;
use App\Models\Unit;
use App\Services\CodeGenerator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DocumentController extends Controller
{
    /**
     * Short morph-map keys (see AppServiceProvider) a Document can attach
     * to, and the picker label shown for each in the form.
     *
     * @var array<string, class-string<Model>>
     */
    public const DOCUMENTABLE_TYPES = [
        'property' => Property::class,
        'unit' => Unit::class,
        'tenant' => Tenant::class,
        'lease' => Lease::class,
    ];

    public function __construct(private readonly CodeGenerator $codes) {}

    public function index(Request $request): Response
    {
        $filters = $this->parseFilters($request);
        $dir = $request->string('dir', 'desc')->value() === 'asc' ? 'asc' : 'desc';
        $perPage = (int) $request->integer('per_page', 10);
        $perPage = in_array($perPage, [10, 25, 50], true) ? $perPage : 10;

        $query = $filters['tab'] === 'trash'
            ? Document::onlyTrashed()->with('deletedBy')
            : Document::query();

        $query->with(['documentable', 'uploadedBy', 'category', 'media']);

        if ($filters['search'] !== '') {
            $query->where(fn (Builder $q) => $q->where('title', 'like', "%{$filters['search']}%")
                ->orWhere('code', 'like', "%{$filters['search']}%"));
        }

        if ($filters['tab'] !== 'trash') {
            if ($filters['categoryIds'] !== []) {
                $query->whereIn('category_id', $filters['categoryIds']);
            }

            if ($filters['types'] !== []) {
                $query->whereIn('documentable_type', $filters['types']);
            }
        }

        $query->orderBy('created_at', $dir)->orderBy('id');

        $paginator = $query->paginate($perPage)->withQueryString();

        return Inertia::render('documents/index', [
            'documents' => [
                'data' => $paginator->getCollection()
                    ->map(fn (Document $document) => $this->transform($document, $filters['tab'] === 'trash'))
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
                'category_id' => $filters['categoryIds'],
                'type' => $filters['types'],
                'dir' => $dir,
                'per_page' => $perPage,
                'tab' => $filters['tab'],
            ],
            'counts' => [
                'active' => Document::count(),
                'trash' => Document::onlyTrashed()->count(),
            ],
            'categories' => $this->categoryOptions(),
            'types' => $this->typeOptions(),
        ]);
    }

    /**
     * @return array{tab: string, search: string, categoryIds: array<int, string>, types: array<int, string>}
     */
    private function parseFilters(Request $request): array
    {
        return [
            'tab' => $request->string('tab', 'active')->value() === 'trash' ? 'trash' : 'active',
            'search' => $request->string('search')->trim()->value(),
            'categoryIds' => array_values(array_filter((array) $request->input('category_id', []))),
            'types' => array_values(array_intersect(
                (array) $request->input('type', []),
                array_keys(self::DOCUMENTABLE_TYPES),
            )),
        ];
    }

    public function create(): Response
    {
        return Inertia::render('documents/form', [
            'categories' => $this->categoryOptions(),
            'types' => $this->typeOptions(),
            'attachables' => $this->attachableOptions(),
        ]);
    }

    public function store(StoreDocumentRequest $request): RedirectResponse
    {
        $document = Document::create([
            'code' => $this->codes->generate('document'),
            'documentable_type' => $request->validated('documentable_type'),
            'documentable_id' => $request->validated('documentable_id'),
            'title' => $request->validated('title'),
            'category_id' => $request->validated('category_id'),
            'notes' => $request->validated('notes'),
            'uploaded_by' => $request->user()->id,
        ]);

        if ($this->codes->usesId('document')) {
            $document->forceFill(['code' => $this->codes->generate('document', $document)])->save();
        }

        $document->addMediaFromRequest('file')->toMediaCollection('file');

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$document->title} was added."]);

        return to_route('documents.index');
    }

    public function show(Document $document): Response
    {
        $document->load(['documentable', 'category', 'uploadedBy', 'media']);

        return Inertia::render('documents/show', [
            'document' => $this->transformForShow($document),
        ]);
    }

    public function edit(Document $document): Response
    {
        $document->load(['media', 'documentable']);

        return Inertia::render('documents/form', [
            'document' => $this->transformForForm($document),
            'categories' => $this->categoryOptions(),
            'types' => $this->typeOptions(),
            'attachables' => $this->attachableOptions(),
        ]);
    }

    public function update(UpdateDocumentRequest $request, Document $document): RedirectResponse
    {
        $document->update([
            'title' => $request->validated('title'),
            'category_id' => $request->validated('category_id'),
            'notes' => $request->validated('notes'),
        ]);

        if ($request->hasFile('file')) {
            $document->addMediaFromRequest('file')->toMediaCollection('file');
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$document->title} was updated."]);

        return to_route('documents.index');
    }

    public function destroy(Request $request, Document $document): RedirectResponse
    {
        $document->forceFill(['deleted_by' => $request->user()->id])->save();
        $document->delete();

        return back();
    }

    public function restore(Document $document): RedirectResponse
    {
        $document->restore();
        $document->forceFill(['deleted_by' => null])->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$document->title} was restored."]);

        return back();
    }

    public function forceDelete(Document $document): RedirectResponse
    {
        $title = $document->title;
        $document->forceDelete();

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$title} was permanently deleted."]);

        return back();
    }

    /**
     * @return array<string, mixed>
     */
    private function transform(Document $document, bool $withTrashMeta = false): array
    {
        $file = $document->getFirstMedia('file');

        $data = [
            'id' => $document->id,
            'code' => $document->code,
            'title' => $document->title,
            'category_label' => $document->category?->name,
            'documentable_type' => $document->documentable_type,
            'documentable_label' => $this->documentableLabel($document),
            'uploaded_by_name' => $document->uploadedBy?->name,
            'file' => $file ? ['name' => $file->file_name, 'url' => $file->getUrl()] : null,
            'created_at' => $document->created_at?->toIso8601String(),
        ];

        if ($withTrashMeta) {
            $data['deleted_at'] = $document->deleted_at?->toIso8601String();
            $data['deleted_by_name'] = $document->deletedBy?->name;
        }

        return $data;
    }

    /**
     * @return array<string, mixed>
     */
    private function transformForForm(Document $document): array
    {
        $file = $document->getFirstMedia('file');

        return [
            'id' => $document->id,
            'title' => $document->title,
            'category_id' => (string) $document->category_id,
            'notes' => $document->notes,
            'documentable_type' => $document->documentable_type,
            'documentable_id' => (string) $document->documentable_id,
            'documentable_label' => $this->documentableLabel($document),
            'file' => $file ? ['name' => $file->file_name, 'url' => $file->getUrl()] : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformForShow(Document $document): array
    {
        $file = $document->getFirstMedia('file');

        return [
            'id' => $document->id,
            'code' => $document->code,
            'title' => $document->title,
            'notes' => $document->notes,
            'category_label' => $document->category?->name,
            'documentable_type' => $document->documentable_type,
            'documentable_label' => $this->documentableLabel($document),
            'documentable_url' => $this->documentableUrl($document),
            'uploaded_by_name' => $document->uploadedBy?->name,
            'file' => $file ? ['name' => $file->file_name, 'url' => $file->getUrl(), 'mime_type' => $file->mime_type] : null,
            'created_at' => $document->created_at?->toIso8601String(),
        ];
    }

    private function documentableLabel(Document $document): ?string
    {
        $model = $document->documentable;

        return match (true) {
            $model instanceof Lease => "Lease #{$model->id}",
            $model === null => null,
            default => $model->name ?? null,
        };
    }

    private function documentableUrl(Document $document): ?string
    {
        $model = $document->documentable;

        return match (true) {
            $model instanceof Property => route('properties.show', $model),
            $model instanceof Unit => route('units.show', ['property' => $model->property_id, 'unit' => $model]),
            $model instanceof Tenant => route('tenants.show', $model),
            $model instanceof Lease => route('leases.show', $model),
            default => null,
        };
    }

    /**
     * All records for every attachable type, grouped by type key, so the
     * form can switch the picker's option list client-side without a round
     * trip.
     *
     * @return array<string, array<int, array{value: string, label: string}>>
     */
    private function attachableOptions(): array
    {
        return [
            'property' => Property::query()->orderBy('name')->get()
                ->map(fn (Property $p) => ['value' => (string) $p->id, 'label' => $p->name])->all(),
            'unit' => Unit::query()->with('property')->orderBy('name')->get()
                ->map(fn (Unit $u) => ['value' => (string) $u->id, 'label' => "{$u->name} — {$u->property?->name}"])->all(),
            'tenant' => Tenant::query()->orderBy('name')->get()
                ->map(fn (Tenant $t) => ['value' => (string) $t->id, 'label' => $t->name])->all(),
            'lease' => Lease::query()->with('unit.property')->orderByDesc('start_date')->get()
                ->map(fn (Lease $l) => ['value' => (string) $l->id, 'label' => "Lease #{$l->id} — {$l->unit?->name}"])->all(),
        ];
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function categoryOptions(): array
    {
        return Category::query()->ofType(CategoryType::Document)->orderBy('name')->get()
            ->map(fn (Category $category) => ['value' => (string) $category->id, 'label' => $category->name])
            ->all();
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function typeOptions(): array
    {
        return [
            ['value' => 'property', 'label' => 'Property'],
            ['value' => 'unit', 'label' => 'Unit'],
            ['value' => 'tenant', 'label' => 'Tenant'],
            ['value' => 'lease', 'label' => 'Lease'],
        ];
    }
}
