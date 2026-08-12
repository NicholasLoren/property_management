<?php

namespace App\Http\Controllers;

use App\Enums\CategoryType;
use App\Enums\TransactionType;
use App\Http\Requests\Incomes\StoreIncomeRequest;
use App\Http\Requests\Incomes\UpdateIncomeRequest;
use App\Models\Category;
use App\Models\Property;
use App\Models\Transaction;
use App\Services\CodeGenerator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class IncomeController extends Controller
{
    public function __construct(private readonly CodeGenerator $codes) {}

    public function index(Request $request): Response
    {
        $filters = $this->parseFilters($request);
        $sort = $request->string('sort', 'transaction_date')->value();
        $dir = $request->string('dir', 'desc')->value() === 'asc' ? 'asc' : 'desc';
        $perPage = (int) $request->integer('per_page', 10);
        $perPage = in_array($perPage, [10, 25, 50], true) ? $perPage : 10;

        $query = $this->baseQuery($filters['tab']);
        $query->with(['property', 'category']);

        if ($filters['search'] !== '') {
            $query->where(fn (Builder $q) => $q->where('description', 'like', "%{$filters['search']}%")
                ->orWhere('code', 'like', "%{$filters['search']}%")
                ->orWhereHas('property', fn (Builder $p) => $p->where('name', 'like', "%{$filters['search']}%")));
        }

        if ($filters['tab'] !== 'trash') {
            if ($filters['categoryIds'] !== []) {
                $query->whereIn('category_id', $filters['categoryIds']);
            }

            if ($filters['propertyIds'] !== []) {
                $query->whereIn('property_id', $filters['propertyIds']);
            }
        }

        $sortColumn = $sort === 'amount' ? 'amount' : 'transaction_date';
        $query->orderBy($sortColumn, $dir)->orderBy('id');

        $paginator = $query->paginate($perPage)->withQueryString();

        return Inertia::render('incomes/index', [
            'incomes' => [
                'data' => $paginator->getCollection()
                    ->map(fn (Transaction $transaction) => $this->transform($transaction, $filters['tab'] === 'trash'))
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
                'property_id' => $filters['propertyIds'],
                'sort' => $sort,
                'dir' => $dir,
                'per_page' => $perPage,
                'tab' => $filters['tab'],
            ],
            'counts' => [
                'active' => $this->baseQuery('active')->count(),
                'trash' => $this->baseQuery('trash')->count(),
            ],
            'total' => (string) $this->baseQuery('active')->sum('amount'),
            'categories' => $this->categoryOptions(),
            'properties' => $this->propertyOptions(),
        ]);
    }

    /**
     * @return Builder<Transaction>
     */
    private function baseQuery(string $tab): Builder
    {
        $query = $tab === 'trash'
            ? Transaction::onlyTrashed()->with('deletedBy')
            : Transaction::query();

        return $query->where('type', TransactionType::Income->value);
    }

    /**
     * @return array{tab: string, search: string, categoryIds: array<int, string>, propertyIds: array<int, string>}
     */
    private function parseFilters(Request $request): array
    {
        return [
            'tab' => $request->string('tab', 'active')->value() === 'trash' ? 'trash' : 'active',
            'search' => $request->string('search')->trim()->value(),
            'categoryIds' => array_values(array_filter((array) $request->input('category_id', []))),
            'propertyIds' => array_values(array_filter((array) $request->input('property_id', []))),
        ];
    }

    public function create(): Response
    {
        return Inertia::render('incomes/form', [
            'properties' => $this->propertyOptions(),
            'categories' => $this->categoryOptions(),
        ]);
    }

    public function store(StoreIncomeRequest $request): RedirectResponse
    {
        $transaction = Transaction::create([
            'code' => $this->codes->generate('income'),
            'property_id' => $request->validated('property_id'),
            'type' => TransactionType::Income,
            'category_id' => $request->validated('category_id'),
            'amount' => $request->validated('amount'),
            'transaction_date' => $request->validated('transaction_date'),
            'description' => $request->validated('description'),
            'created_by' => $request->user()->id,
        ]);

        if ($this->codes->usesId('income')) {
            $transaction->forceFill(['code' => $this->codes->generate('income', $transaction)])->save();
        }

        $this->syncReceipt($request, $transaction);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Income was added.']);

        return to_route('incomes.index');
    }

    public function show(Transaction $income): Response
    {
        abort_unless($income->type === TransactionType::Income, 404);
        $income->load(['property', 'category', 'media', 'createdBy']);

        return Inertia::render('incomes/show', [
            'income' => $this->transformForShow($income),
        ]);
    }

    /**
     * A JSON payload of the same shape as show() — used by the index
     * table's quick-view drawer, which fetches without a full navigation.
     */
    public function preview(Transaction $income): JsonResponse
    {
        abort_unless($income->type === TransactionType::Income, 404);
        $income->load(['property', 'category', 'media', 'createdBy']);

        return response()->json(['income' => $this->transformForShow($income)]);
    }

    public function edit(Transaction $income): Response
    {
        abort_unless($income->type === TransactionType::Income, 404);
        $income->load('media');

        return Inertia::render('incomes/form', [
            'income' => $this->transformForForm($income),
            'properties' => $this->propertyOptions(),
            'categories' => $this->categoryOptions(),
        ]);
    }

    public function update(UpdateIncomeRequest $request, Transaction $income): RedirectResponse
    {
        abort_unless($income->type === TransactionType::Income, 404);

        $income->update([
            'property_id' => $request->validated('property_id'),
            'category_id' => $request->validated('category_id'),
            'amount' => $request->validated('amount'),
            'transaction_date' => $request->validated('transaction_date'),
            'description' => $request->validated('description'),
        ]);

        if ($request->boolean('receipt_remove')) {
            $income->clearMediaCollection('receipt');
        }

        $this->syncReceipt($request, $income);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Income was updated.']);

        return to_route('incomes.index');
    }

    public function destroy(Request $request, Transaction $income): RedirectResponse
    {
        abort_unless($income->type === TransactionType::Income, 404);

        $income->forceFill(['deleted_by' => $request->user()->id])->save();
        $income->delete();

        return back();
    }

    public function restore(Transaction $income): RedirectResponse
    {
        $income->restore();
        $income->forceFill(['deleted_by' => null])->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Income was restored.']);

        return back();
    }

    public function forceDelete(Transaction $income): RedirectResponse
    {
        $income->forceDelete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Income was permanently deleted.']);

        return back();
    }

    private function syncReceipt(Request $request, Transaction $transaction): void
    {
        if (! $request->hasFile('receipt')) {
            return;
        }

        $transaction->addMediaFromRequest('receipt')->toMediaCollection('receipt');
    }

    /**
     * @return array<string, mixed>
     */
    private function transform(Transaction $transaction, bool $withTrashMeta = false): array
    {
        $data = [
            'id' => $transaction->id,
            'code' => $transaction->code,
            'property_name' => $transaction->property?->name,
            'category_label' => $transaction->category?->name,
            'amount' => (string) $transaction->amount,
            'transaction_date' => $transaction->transaction_date->toDateString(),
            'description' => $transaction->description,
        ];

        if ($withTrashMeta) {
            $data['deleted_at'] = $transaction->deleted_at?->toIso8601String();
            $data['deleted_by_name'] = $transaction->deletedBy?->name;
        }

        return $data;
    }

    /**
     * @return array<string, mixed>
     */
    private function transformForForm(Transaction $transaction): array
    {
        $receipt = $transaction->getFirstMedia('receipt');

        return [
            'id' => $transaction->id,
            'property_id' => (string) $transaction->property_id,
            'category_id' => (string) $transaction->category_id,
            'amount' => (string) $transaction->amount,
            'transaction_date' => $transaction->transaction_date->toDateString(),
            'description' => $transaction->description,
            'receipt' => $receipt ? ['name' => $receipt->file_name, 'url' => $receipt->getUrl()] : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformForShow(Transaction $transaction): array
    {
        $receipt = $transaction->getFirstMedia('receipt');

        return [
            'id' => $transaction->id,
            'code' => $transaction->code,
            'property_name' => $transaction->property?->name,
            'category_label' => $transaction->category?->name,
            'amount' => (string) $transaction->amount,
            'transaction_date' => $transaction->transaction_date->toDateString(),
            'description' => $transaction->description,
            'receipt' => $receipt ? ['name' => $receipt->file_name, 'url' => $receipt->getUrl()] : null,
            'created_by_name' => $transaction->createdBy?->name,
            'created_at' => $transaction->created_at?->toIso8601String(),
        ];
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function propertyOptions(): array
    {
        return Property::query()->orderBy('name')->get()
            ->map(fn (Property $property) => ['value' => (string) $property->id, 'label' => $property->name])
            ->all();
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function categoryOptions(): array
    {
        return Category::query()->ofType(CategoryType::Income)->orderBy('name')->get()
            ->map(fn (Category $category) => ['value' => (string) $category->id, 'label' => $category->name])
            ->all();
    }
}
