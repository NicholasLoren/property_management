<?php

namespace App\Http\Controllers;

use App\Enums\CategoryType;
use App\Enums\TransactionType;
use App\Http\Requests\Expenses\StoreExpenseRequest;
use App\Http\Requests\Expenses\UpdateExpenseRequest;
use App\Models\Category;
use App\Models\Property;
use App\Models\Transaction;
use App\Services\CodeGenerator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ExpenseController extends Controller
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
        $query->with(['property', 'category', 'maintenanceRequest']);

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

        return Inertia::render('expenses/index', [
            'expenses' => [
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

        return $query->where('type', TransactionType::Expense->value);
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
        return Inertia::render('expenses/form', [
            'properties' => $this->propertyOptions(),
            'categories' => $this->categoryOptions(),
        ]);
    }

    public function store(StoreExpenseRequest $request): RedirectResponse
    {
        $transaction = Transaction::create([
            'code' => $this->codes->generate('expense'),
            'property_id' => $request->validated('property_id'),
            'type' => TransactionType::Expense,
            'category_id' => $request->validated('category_id'),
            'amount' => $request->validated('amount'),
            'transaction_date' => $request->validated('transaction_date'),
            'description' => $request->validated('description'),
            'created_by' => $request->user()->id,
        ]);

        if ($this->codes->usesId('expense')) {
            $transaction->forceFill(['code' => $this->codes->generate('expense', $transaction)])->save();
        }

        $this->syncReceipt($request, $transaction);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Expense was added.']);

        return to_route('expenses.index');
    }

    public function edit(Transaction $expense): Response
    {
        abort_unless($expense->type === TransactionType::Expense, 404);
        $expense->load('media');

        return Inertia::render('expenses/form', [
            'expense' => $this->transformForForm($expense),
            'properties' => $this->propertyOptions(),
            'categories' => $this->categoryOptions(),
        ]);
    }

    public function update(UpdateExpenseRequest $request, Transaction $expense): RedirectResponse
    {
        abort_unless($expense->type === TransactionType::Expense, 404);

        $expense->update([
            'property_id' => $request->validated('property_id'),
            'category_id' => $request->validated('category_id'),
            'amount' => $request->validated('amount'),
            'transaction_date' => $request->validated('transaction_date'),
            'description' => $request->validated('description'),
        ]);

        if ($request->boolean('receipt_remove')) {
            $expense->clearMediaCollection('receipt');
        }

        $this->syncReceipt($request, $expense);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Expense was updated.']);

        return to_route('expenses.index');
    }

    public function destroy(Request $request, Transaction $expense): RedirectResponse
    {
        abort_unless($expense->type === TransactionType::Expense, 404);

        $expense->forceFill(['deleted_by' => $request->user()->id])->save();
        $expense->delete();

        return back();
    }

    public function restore(Transaction $expense): RedirectResponse
    {
        $expense->restore();
        $expense->forceFill(['deleted_by' => null])->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Expense was restored.']);

        return back();
    }

    public function forceDelete(Transaction $expense): RedirectResponse
    {
        $expense->forceDelete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Expense was permanently deleted.']);

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
            'is_from_maintenance' => $transaction->maintenance_request_id !== null,
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
        return Category::query()->ofType(CategoryType::Expense)->orderBy('name')->get()
            ->map(fn (Category $category) => ['value' => (string) $category->id, 'label' => $category->name])
            ->all();
    }
}
