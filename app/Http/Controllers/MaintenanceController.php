<?php

namespace App\Http\Controllers;

use App\Enums\CategoryType;
use App\Enums\MaintenancePriority;
use App\Enums\MaintenanceStatus;
use App\Enums\TransactionType;
use App\Http\Requests\Maintenance\StoreMaintenanceRequestRequest;
use App\Http\Requests\Maintenance\UpdateMaintenanceRequestRequest;
use App\Models\Category;
use App\Models\MaintenanceRequest;
use App\Models\Transaction;
use App\Models\Unit;
use App\Models\User;
use App\Services\CodeGenerator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class MaintenanceController extends Controller
{
    public function __construct(private readonly CodeGenerator $codes) {}

    public function index(Request $request): Response
    {
        $filters = $this->parseFilters($request);
        $sort = $request->string('sort', 'created_at')->value();
        $dir = $request->string('dir', 'desc')->value() === 'asc' ? 'asc' : 'desc';
        $perPage = (int) $request->integer('per_page', 10);
        $perPage = in_array($perPage, [10, 25, 50], true) ? $perPage : 10;

        $query = $filters['tab'] === 'trash'
            ? MaintenanceRequest::onlyTrashed()->with('deletedBy')
            : MaintenanceRequest::query();

        $query->with(['unit.property', 'assignedTo']);

        if ($filters['search'] !== '') {
            $query->where(fn (Builder $q) => $q->where('title', 'like', "%{$filters['search']}%")
                ->orWhereHas('unit', fn (Builder $u) => $u->where('name', 'like', "%{$filters['search']}%"))
                ->orWhereHas('unit.property', fn (Builder $p) => $p->where('name', 'like', "%{$filters['search']}%")));
        }

        if ($filters['tab'] !== 'trash') {
            if ($filters['statuses'] !== []) {
                $query->whereIn('status', $filters['statuses']);
            }

            if ($filters['priorities'] !== []) {
                $query->whereIn('priority', $filters['priorities']);
            }
        }

        $sortColumn = in_array($sort, ['status', 'priority'], true) ? $sort : 'created_at';
        $query->orderBy($sortColumn, $dir)->orderBy('id');

        $paginator = $query->paginate($perPage)->withQueryString();

        return Inertia::render('maintenance/index', [
            'requests' => [
                'data' => $paginator->getCollection()
                    ->map(fn (MaintenanceRequest $item) => $this->transform($item, $filters['tab'] === 'trash'))
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
                'priority' => $filters['priorities'],
                'sort' => $sort,
                'dir' => $dir,
                'per_page' => $perPage,
                'tab' => $filters['tab'],
            ],
            'counts' => [
                'active' => MaintenanceRequest::count(),
                'trash' => MaintenanceRequest::onlyTrashed()->count(),
            ],
            'statuses' => $this->statusOptions(),
            'priorities' => $this->priorityOptions(),
        ]);
    }

    /**
     * @return array{tab: string, search: string, statuses: array<int, string>, priorities: array<int, string>}
     */
    private function parseFilters(Request $request): array
    {
        return [
            'tab' => $request->string('tab', 'active')->value() === 'trash' ? 'trash' : 'active',
            'search' => $request->string('search')->trim()->value(),
            'statuses' => array_values(array_intersect(
                (array) $request->input('status', []),
                array_column(MaintenanceStatus::cases(), 'value'),
            )),
            'priorities' => array_values(array_intersect(
                (array) $request->input('priority', []),
                array_column(MaintenancePriority::cases(), 'value'),
            )),
        ];
    }

    public function create(): Response
    {
        return Inertia::render('maintenance/form', [
            'units' => $this->unitOptions(),
            'assignees' => $this->assigneeOptions(),
            'statuses' => $this->statusOptions(),
            'priorities' => $this->priorityOptions(),
        ]);
    }

    public function store(StoreMaintenanceRequestRequest $request): RedirectResponse
    {
        $maintenanceRequest = MaintenanceRequest::create([
            'unit_id' => $request->validated('unit_id'),
            'title' => $request->validated('title'),
            'description' => $request->validated('description'),
            'priority' => $request->validated('priority'),
            'status' => $request->validated('status'),
            'assigned_to' => $request->validated('assigned_to'),
            'cost' => $request->validated('cost'),
            'scheduled_date' => $request->validated('scheduled_date'),
            'completed_at' => $request->validated('completed_at'),
            'notes' => $request->validated('notes'),
        ]);

        $this->syncPhotos($request, $maintenanceRequest);
        $this->syncExpense($request, $maintenanceRequest);

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$maintenanceRequest->title} was added."]);

        return to_route('maintenance.index');
    }

    public function edit(MaintenanceRequest $maintenance): Response
    {
        $maintenance->load(['unit.property', 'media']);

        return Inertia::render('maintenance/form', [
            'maintenanceRequest' => $this->transformForForm($maintenance),
            'units' => $this->unitOptions(),
            'assignees' => $this->assigneeOptions(),
            'statuses' => $this->statusOptions(),
            'priorities' => $this->priorityOptions(),
        ]);
    }

    public function update(UpdateMaintenanceRequestRequest $request, MaintenanceRequest $maintenance): RedirectResponse
    {
        $maintenance->update([
            'title' => $request->validated('title'),
            'description' => $request->validated('description'),
            'priority' => $request->validated('priority'),
            'status' => $request->validated('status'),
            'assigned_to' => $request->validated('assigned_to'),
            'cost' => $request->validated('cost'),
            'scheduled_date' => $request->validated('scheduled_date'),
            'completed_at' => $request->validated('completed_at'),
            'notes' => $request->validated('notes'),
        ]);

        foreach ($request->validated('remove_photo_ids', []) as $mediaId) {
            $maintenance->media()->where('id', $mediaId)->first()?->delete();
        }

        $this->syncPhotos($request, $maintenance);
        $this->syncExpense($request, $maintenance);

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$maintenance->title} was updated."]);

        return to_route('maintenance.index');
    }

    public function show(MaintenanceRequest $maintenance): Response
    {
        $maintenance->load(['unit.property', 'assignedTo', 'media', 'expense']);

        return Inertia::render('maintenance/show', [
            'maintenanceRequest' => $this->transformForShow($maintenance),
        ]);
    }

    public function destroy(Request $request, MaintenanceRequest $maintenance): RedirectResponse
    {
        $maintenance->forceFill(['deleted_by' => $request->user()->id])->save();
        $maintenance->delete();

        return back();
    }

    public function restore(MaintenanceRequest $maintenance): RedirectResponse
    {
        $maintenance->restore();
        $maintenance->forceFill(['deleted_by' => null])->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$maintenance->title} was restored."]);

        return back();
    }

    public function forceDelete(MaintenanceRequest $maintenance): RedirectResponse
    {
        $title = $maintenance->title;
        $maintenance->forceDelete();

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$title} was permanently deleted."]);

        return back();
    }

    private function syncPhotos(Request $request, MaintenanceRequest $maintenance): void
    {
        if (! $request->hasFile('photos')) {
            return;
        }

        $maintenance->addMultipleMediaFromRequest(['photos'])
            ->each(fn ($adder) => $adder->toMediaCollection('photos'));
    }

    /**
     * Completing a request with a cost set keeps a linked expense
     * Transaction in sync (created on first completion, amount/date kept
     * current on later edits) — see MaintenanceRequest's class doc.
     */
    private function syncExpense(Request $request, MaintenanceRequest $maintenance): void
    {
        if ($maintenance->status !== MaintenanceStatus::Completed || $maintenance->cost === null) {
            return;
        }

        $unit = $maintenance->unit ?? $maintenance->unit()->firstOrFail();

        $maintenanceCategory = Category::query()->ofType(CategoryType::Expense)->where('name', 'Maintenance')->first()
            ?? Category::query()->ofType(CategoryType::Expense)->firstOrCreate(['type' => CategoryType::Expense->value, 'name' => 'Maintenance']);

        $expense = Transaction::query()->updateOrCreate(
            ['maintenance_request_id' => $maintenance->id],
            [
                'property_id' => $unit->property_id,
                'type' => TransactionType::Expense,
                'category_id' => $maintenanceCategory->id,
                'amount' => $maintenance->cost,
                'transaction_date' => ($maintenance->completed_at ?? now())->toDateString(),
                'description' => "Maintenance: {$maintenance->title}",
                'created_by' => $request->user()?->id,
            ],
        );

        if ($expense->wasRecentlyCreated) {
            $code = $this->codes->generate('expense');
            $expense->forceFill(['code' => $this->codes->usesId('expense') ? $this->codes->generate('expense', $expense) : $code])->save();
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function transform(MaintenanceRequest $maintenance, bool $withTrashMeta = false): array
    {
        $data = [
            'id' => $maintenance->id,
            'title' => $maintenance->title,
            'unit_name' => $maintenance->unit?->name,
            'property_name' => $maintenance->unit?->property?->name,
            'priority' => $maintenance->priority->value,
            'priority_label' => $maintenance->priority->label(),
            'status' => $maintenance->status->value,
            'status_label' => $maintenance->status->label(),
            'assigned_to_name' => $maintenance->assignedTo?->name,
            'cost' => $maintenance->cost !== null ? (string) $maintenance->cost : null,
            'scheduled_date' => $maintenance->scheduled_date?->toDateString(),
            'created_at' => $maintenance->created_at?->toIso8601String(),
        ];

        if ($withTrashMeta) {
            $data['deleted_at'] = $maintenance->deleted_at?->toIso8601String();
            $data['deleted_by_name'] = $maintenance->deletedBy?->name;
        }

        return $data;
    }

    /**
     * @return array<string, mixed>
     */
    private function transformForForm(MaintenanceRequest $maintenance): array
    {
        return [
            'id' => $maintenance->id,
            'unit_id' => (string) $maintenance->unit_id,
            'unit_label' => $maintenance->unit !== null
                ? "{$maintenance->unit->name} — {$maintenance->unit->property?->name}"
                : null,
            'title' => $maintenance->title,
            'description' => $maintenance->description,
            'priority' => $maintenance->priority->value,
            'status' => $maintenance->status->value,
            'assigned_to' => $maintenance->assigned_to !== null ? (string) $maintenance->assigned_to : null,
            'cost' => $maintenance->cost !== null ? (string) $maintenance->cost : null,
            'scheduled_date' => $maintenance->scheduled_date?->toDateString(),
            'completed_at' => $maintenance->completed_at?->toDateString(),
            'notes' => $maintenance->notes,
            'photos' => $maintenance->media->map(fn (Media $media): array => [
                'id' => $media->id,
                'name' => $media->file_name,
                'url' => $media->getUrl(),
            ])->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformForShow(MaintenanceRequest $maintenance): array
    {
        return [
            'id' => $maintenance->id,
            'title' => $maintenance->title,
            'description' => $maintenance->description,
            'unit' => $maintenance->unit !== null ? [
                'id' => $maintenance->unit->id,
                'name' => $maintenance->unit->name,
                'property_id' => $maintenance->unit->property_id,
                'property_name' => $maintenance->unit->property?->name,
            ] : null,
            'priority' => $maintenance->priority->value,
            'priority_label' => $maintenance->priority->label(),
            'status' => $maintenance->status->value,
            'status_label' => $maintenance->status->label(),
            'assigned_to_name' => $maintenance->assignedTo?->name,
            'cost' => $maintenance->cost !== null ? (string) $maintenance->cost : null,
            'scheduled_date' => $maintenance->scheduled_date?->toDateString(),
            'completed_at' => $maintenance->completed_at?->toDateString(),
            'notes' => $maintenance->notes,
            'linked_expense_id' => $maintenance->expense?->id,
            'photos' => $maintenance->media->map(fn (Media $media): array => [
                'id' => $media->id,
                'name' => $media->file_name,
                'url' => $media->getUrl(),
            ])->all(),
            'created_at' => $maintenance->created_at?->toIso8601String(),
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
                'label' => "{$unit->name} — {$unit->property?->name}",
            ])
            ->all();
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function assigneeOptions(): array
    {
        return User::query()->orderBy('name')->get()
            ->map(fn (User $user) => ['value' => (string) $user->id, 'label' => $user->name])
            ->all();
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function statusOptions(): array
    {
        return array_map(
            fn (MaintenanceStatus $status) => ['value' => $status->value, 'label' => $status->label()],
            MaintenanceStatus::cases(),
        );
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function priorityOptions(): array
    {
        return array_map(
            fn (MaintenancePriority $priority) => ['value' => $priority->value, 'label' => $priority->label()],
            MaintenancePriority::cases(),
        );
    }
}
