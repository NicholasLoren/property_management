<?php

namespace App\Http\Controllers;

use App\Enums\LeaseStatus;
use App\Enums\PaymentScheduleStatus;
use App\Enums\PaymentStatus;
use App\Enums\TransactionType;
use App\Enums\UnitStatus;
use App\Exports\ReportExport;
use App\Models\Lease;
use App\Models\Payment;
use App\Models\PaymentSchedule;
use App\Models\Property;
use App\Models\Tenant;
use App\Models\Transaction;
use App\Models\Unit;
use App\Services\PortfolioMetrics;
use App\Settings\BrandingSettings;
use App\Support\Branding;
use App\Support\ReportCatalog;
use App\Support\ReportTableParams;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class ReportController extends Controller
{
    public function __construct(private readonly PortfolioMetrics $metrics) {}

    public function index(): Response
    {
        return Inertia::render('reports/index', [
            'categories' => ReportCatalog::grouped(),
        ]);
    }

    public function show(Request $request, string $type): Response
    {
        $definition = $this->definition($type);
        [$from, $to] = $this->parseFilters($request);
        [$propertyId, $unitId] = $this->parseScope($request);
        $table = $this->parseTableParams($request);

        $report = $this->build($type, $from, $to, $propertyId, $unitId, $table);

        return Inertia::render('reports/show', [
            'type' => $type,
            'title' => $definition['title'],
            'description' => $definition['description'],
            'date_filter' => $definition['date_filter'],
            'filters' => [
                'from' => $definition['date_filter'] ? $from->toDateString() : null,
                'to' => $definition['date_filter'] ? $to->toDateString() : null,
                'property_id' => $propertyId !== null ? (string) $propertyId : null,
                'unit_id' => $unitId !== null ? (string) $unitId : null,
                'search' => $table->search,
                'sort' => $report['sort'],
                'dir' => $report['dir'],
                'per_page' => $table->perPage,
            ],
            'properties' => $this->propertyOptions(),
            'units' => $this->unitOptions(),
            'columns' => $report['columns'],
            'rows' => $report['rows'],
            'summary' => $report['summary'],
            'pagination' => $report['pagination'],
        ]);
    }

    public function export(Request $request, string $type, string $format, BrandingSettings $branding): HttpResponse
    {
        $definition = $this->definition($type);
        [$from, $to] = $this->parseFilters($request);
        [$propertyId, $unitId] = $this->parseScope($request);

        $report = $this->build($type, $from, $to, $propertyId, $unitId, ReportTableParams::forExport());
        $headings = array_map(fn (array $column) => $column['label'], $report['columns']);
        $keys = array_map(fn (array $column) => $column['key'], $report['columns']);

        $rows = array_map(
            fn (array $row) => array_map(fn (string $key) => (string) ($row[$key] ?? ''), $keys),
            $report['rows'],
        );

        $export = new ReportExport($rows, $headings);
        $filename = str_replace('-', '_', $type);

        return $format === 'excel'
            ? $export->download("{$filename}.xlsx")
            : Pdf::loadView('exports.pdf-table', [
                'title' => $definition['title'],
                'headings' => $headings,
                'rows' => $rows,
                'headerText' => $branding->pdf_header_text,
                'accentColor' => $branding->accent_color,
                'logoDataUri' => Branding::logoDataUri(),
            ])->download("{$filename}.pdf");
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function propertyOptions(): array
    {
        return Property::query()->orderBy('name')->get(['id', 'name'])
            ->map(fn (Property $p): array => ['value' => (string) $p->id, 'label' => $p->name])
            ->all();
    }

    /**
     * @return array<int, array{value: string, label: string, property_id: string}>
     */
    private function unitOptions(): array
    {
        return Unit::query()->orderBy('name')->get(['id', 'name', 'property_id'])
            ->map(fn (Unit $u): array => [
                'value' => (string) $u->id,
                'label' => $u->name,
                'property_id' => (string) $u->property_id,
            ])
            ->all();
    }

    /**
     * @return array{title: string, description: string, icon: string, date_filter: bool, category: string}
     */
    private function definition(string $type): array
    {
        $definitions = ReportCatalog::definitions();

        if (! array_key_exists($type, $definitions)) {
            throw new NotFoundHttpException("Unknown report type \"{$type}\".");
        }

        return $definitions[$type];
    }

    /**
     * @return array{0: Carbon, 1: Carbon}
     */
    private function parseFilters(Request $request): array
    {
        $from = $request->string('from')->value();
        $to = $request->string('to')->value();

        return [
            $from !== '' ? Carbon::parse($from)->startOfDay() : Carbon::now()->startOfMonth(),
            $to !== '' ? Carbon::parse($to)->endOfDay() : Carbon::now()->endOfDay(),
        ];
    }

    /**
     * @return array{0: int|null, 1: int|null}
     */
    private function parseScope(Request $request): array
    {
        return [
            $request->integer('property_id') ?: null,
            $request->integer('unit_id') ?: null,
        ];
    }

    private function parseTableParams(Request $request): ReportTableParams
    {
        $perPage = (int) $request->integer('per_page', 10);
        $perPage = in_array($perPage, [10, 25, 50], true) ? $perPage : 10;

        return new ReportTableParams(
            page: max(1, $request->integer('page', 1)),
            perPage: $perPage,
            sort: $request->string('sort')->value(),
            dir: $request->string('dir', 'asc')->value() === 'desc' ? 'desc' : 'asc',
            search: $request->string('search')->trim()->value(),
        );
    }

    /**
     * @param  LengthAwarePaginator<int, Model>  $paginator
     * @return array{current_page: int, last_page: int, per_page: int, total: int, from: int|null, to: int|null}
     */
    private function paginationMeta(LengthAwarePaginator $paginator): array
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

    /**
     * Runs a report's query either fully (export — every matching row, in
     * the query's default order) or as one page (the on-screen table).
     *
     * @param  Builder<*>  $query
     * @param  callable(mixed): array<string, string>  $mapRow
     * @return array{0: array<int, array<string, string>>, 1: array<string, mixed>|null}
     */
    private function fetchRows(Builder $query, ReportTableParams $table, callable $mapRow): array
    {
        if (! $table->isPaginated()) {
            return [$query->get()->map($mapRow)->all(), null];
        }

        $paginator = $query->paginate($table->perPage, ['*'], 'page', $table->page);

        return [$paginator->getCollection()->map($mapRow)->all(), $this->paginationMeta($paginator)];
    }

    /**
     * Search + sort + paginate an already-fully-fetched row collection —
     * used by reports whose rows come from merging multiple sources
     * (income) or are a small computed aggregate (profit-loss), neither of
     * which maps onto a single paginatable query.
     *
     * @param  Collection<int, array<string, string>>  $rows
     * @param  array<int, string>  $searchableKeys
     * @param  array<int, string>  $numericKeys
     * @return array{0: array<int, array<string, string>>, 1: array<string, mixed>|null}
     */
    private function searchSortPaginate(
        Collection $rows,
        ReportTableParams $table,
        array $searchableKeys,
        array $numericKeys = [],
    ): array {
        if ($table->search !== '') {
            $needle = mb_strtolower($table->search);
            $rows = $rows->filter(function (array $row) use ($searchableKeys, $needle): bool {
                foreach ($searchableKeys as $key) {
                    if (str_contains(mb_strtolower((string) ($row[$key] ?? '')), $needle)) {
                        return true;
                    }
                }

                return false;
            })->values();
        }

        if ($table->sort !== '') {
            $rows = $rows->sortBy(
                fn (array $row) => in_array($table->sort, $numericKeys, true)
                    ? (float) ($row[$table->sort] ?? 0)
                    : mb_strtolower((string) ($row[$table->sort] ?? '')),
                SORT_REGULAR,
                $table->dir === 'desc',
            )->values();
        }

        if (! $table->isPaginated()) {
            return [$rows->all(), null];
        }

        $total = $rows->count();
        $perPage = $table->perPage;
        $lastPage = max(1, (int) ceil($total / $perPage));
        $currentPage = min($table->page, $lastPage);

        return [
            $rows->slice(($currentPage - 1) * $perPage, $perPage)->values()->all(),
            [
                'current_page' => $currentPage,
                'last_page' => $lastPage,
                'per_page' => $perPage,
                'total' => $total,
                'from' => $total === 0 ? null : ($currentPage - 1) * $perPage + 1,
                'to' => $total === 0 ? null : min($currentPage * $perPage, $total),
            ],
        ];
    }

    /**
     * Scopes a query on a model that `belongsTo` Lease (Payment, PaymentSchedule)
     * down to a single unit, or every unit under a single property.
     *
     * @template TModel of Model
     *
     * @param  Builder<TModel>  $query
     * @return Builder<TModel>
     */
    private function scopeByLease(Builder $query, ?int $propertyId, ?int $unitId): Builder
    {
        if ($unitId !== null) {
            return $query->whereHas('lease', fn (Builder $q) => $q->where('unit_id', $unitId));
        }

        if ($propertyId !== null) {
            return $query->whereHas('lease.unit', fn (Builder $q) => $q->where('property_id', $propertyId));
        }

        return $query;
    }

    /**
     * Scopes a Lease query (which `belongsTo` Unit directly) down to a
     * single unit, or every unit under a single property.
     *
     * @template TModel of Model
     *
     * @param  Builder<TModel>  $query
     * @return Builder<TModel>
     */
    private function scopeLeases(Builder $query, ?int $propertyId, ?int $unitId): Builder
    {
        if ($unitId !== null) {
            return $query->where('unit_id', $unitId);
        }

        if ($propertyId !== null) {
            return $query->whereHas('unit', fn (Builder $q) => $q->where('property_id', $propertyId));
        }

        return $query;
    }

    /**
     * @return array{columns: array<int, array{key: string, label: string, type: string, sortable: bool}>, rows: array<int, array<string, string>>, summary: array<int, array{label: string, value: string, type: string}>|null, pagination: array<string, mixed>|null, sort: string, dir: string}
     */
    private function build(string $type, Carbon $from, Carbon $to, ?int $propertyId, ?int $unitId, ReportTableParams $table): array
    {
        return match ($type) {
            'income' => $this->incomeReport($from, $to, $propertyId, $unitId, $table),
            'expense' => $this->expenseReport($from, $to, $propertyId, $table),
            'profit-loss' => $this->profitLossReport($from, $to, $propertyId, $unitId, $table),
            'rent-collection' => $this->rentCollectionReport($from, $to, $propertyId, $unitId, $table),
            'rent-arrears' => $this->rentArrearsReport($propertyId, $unitId, $table),
            'advance-payments' => $this->advancePaymentsReport($propertyId, $unitId, $table),
            'tenant-roster' => $this->tenantRosterReport($propertyId, $unitId, $table),
            'new-residents' => $this->newResidentsReport($from, $to, $propertyId, $unitId, $table),
            'expiring-leases' => $this->expiringLeasesReport($propertyId, $unitId, $table),
            'vacancies' => $this->vacanciesReport($propertyId, $unitId, $table),
            'deposits' => $this->depositsReport($propertyId, $unitId, $table),
            default => throw new NotFoundHttpException("Unknown report type \"{$type}\"."),
        };
    }

    /**
     * @return array{columns: array<int, array{key: string, label: string, type: string, sortable: bool}>, rows: array<int, array<string, string>>, summary: array<int, array{label: string, value: string, type: string}>|null, pagination: array<string, mixed>|null, sort: string, dir: string}
     */
    private function incomeReport(Carbon $from, Carbon $to, ?int $propertyId, ?int $unitId, ReportTableParams $table): array
    {
        $payments = $this->scopeByLease(
            Payment::query()
                ->where('status', PaymentStatus::Completed->value)
                ->whereBetween('payment_date', [$from->toDateString(), $to->toDateString()]),
            $propertyId,
            $unitId,
        )
            ->with('lease.unit.property')
            ->get()
            ->map(fn (Payment $p): array => [
                'date' => $p->payment_date->toDateString(),
                'property' => $p->lease?->unit?->property->name ?? '—',
                'category' => 'Rent',
                'description' => $p->reference ?: 'Rent payment',
                'amount' => (string) $p->amount,
            ]);

        // Transactions are recorded at the property level, not the unit level —
        // a unit-scoped view can't attribute them to a single unit, so they're
        // dropped rather than shown against the wrong unit.
        $transactions = $unitId === null
            ? Transaction::query()
                ->where('type', TransactionType::Income->value)
                ->whereBetween('transaction_date', [$from->toDateString(), $to->toDateString()])
                ->when($propertyId !== null, fn (Builder $q) => $q->where('property_id', $propertyId))
                ->with(['property', 'category'])
                ->get()
                ->map(fn (Transaction $t): array => [
                    'date' => $t->transaction_date->toDateString(),
                    'property' => $t->property->name ?? '—',
                    'category' => $t->category !== null ? $t->category->name : 'Uncategorized',
                    'description' => $t->description ?: '—',
                    'amount' => (string) $t->amount,
                ])
            : collect();

        /** @var Collection<int, array<string, string>> $allRows */
        $allRows = $payments->concat($transactions);

        $sort = in_array($table->sort, ['date', 'property', 'category', 'description', 'amount'], true)
            ? $table->sort
            : 'date';
        $dir = $table->sort === '' ? 'desc' : $table->dir;
        $effectiveTable = new ReportTableParams($table->page, $table->perPage, $sort, $dir, $table->search);

        [$rows, $pagination] = $this->searchSortPaginate(
            $allRows,
            $effectiveTable,
            ['property', 'category', 'description'],
            ['amount'],
        );

        return [
            'columns' => [
                ['key' => 'date', 'label' => 'Date', 'type' => 'date', 'sortable' => true],
                ['key' => 'property', 'label' => 'Property', 'type' => 'text', 'sortable' => true],
                ['key' => 'category', 'label' => 'Category', 'type' => 'text', 'sortable' => true],
                ['key' => 'description', 'label' => 'Description', 'type' => 'text', 'sortable' => true],
                ['key' => 'amount', 'label' => 'Amount', 'type' => 'currency', 'sortable' => true],
            ],
            'rows' => $rows,
            'summary' => [
                ['label' => 'Total income', 'value' => (string) ($payments->sum('amount') + $transactions->sum('amount')), 'type' => 'currency'],
            ],
            'pagination' => $pagination,
            'sort' => $sort,
            'dir' => $dir,
        ];
    }

    /**
     * @return array{columns: array<int, array{key: string, label: string, type: string, sortable: bool}>, rows: array<int, array<string, string>>, summary: array<int, array{label: string, value: string, type: string}>|null, pagination: array<string, mixed>|null, sort: string, dir: string}
     */
    private function expenseReport(Carbon $from, Carbon $to, ?int $propertyId, ReportTableParams $table): array
    {
        $sortColumns = [
            'date' => 'transactions.transaction_date',
            'property' => 'properties.name',
            'category' => 'categories.name',
            'description' => 'transactions.description',
            'amount' => 'transactions.amount',
        ];
        $sort = array_key_exists($table->sort, $sortColumns) ? $table->sort : 'date';
        $dir = $table->sort === '' ? 'desc' : $table->dir;

        $base = Transaction::query()
            ->where('transactions.type', TransactionType::Expense->value)
            ->whereBetween('transactions.transaction_date', [$from->toDateString(), $to->toDateString()])
            ->when($propertyId !== null, fn (Builder $q) => $q->where('transactions.property_id', $propertyId));

        $summary = (clone $base)->sum('amount');

        $query = $base
            ->leftJoin('properties', 'properties.id', '=', 'transactions.property_id')
            ->leftJoin('categories', 'categories.id', '=', 'transactions.category_id')
            ->select('transactions.*')
            ->with(['property', 'category']);

        if ($table->search !== '') {
            $needle = "%{$table->search}%";
            $query->where(fn (Builder $q) => $q->where('transactions.description', 'like', $needle)
                ->orWhere('transactions.code', 'like', $needle)
                ->orWhere('properties.name', 'like', $needle)
                ->orWhere('categories.name', 'like', $needle));
        }

        $query->orderBy($sortColumns[$sort], $dir)->orderBy('transactions.id');

        [$rows, $pagination] = $this->fetchRows($query, $table, fn (Transaction $t): array => [
            'date' => $t->transaction_date->toDateString(),
            'property' => $t->property->name ?? '—',
            'category' => $t->category !== null ? $t->category->name : 'Uncategorized',
            'description' => $t->description ?: '—',
            'amount' => (string) $t->amount,
        ]);

        return [
            'columns' => [
                ['key' => 'date', 'label' => 'Date', 'type' => 'date', 'sortable' => true],
                ['key' => 'property', 'label' => 'Property', 'type' => 'text', 'sortable' => true],
                ['key' => 'category', 'label' => 'Category', 'type' => 'text', 'sortable' => true],
                ['key' => 'description', 'label' => 'Description', 'type' => 'text', 'sortable' => true],
                ['key' => 'amount', 'label' => 'Amount', 'type' => 'currency', 'sortable' => true],
            ],
            'rows' => $rows,
            'summary' => [
                ['label' => 'Total expenses', 'value' => (string) $summary, 'type' => 'currency'],
            ],
            'pagination' => $pagination,
            'sort' => $sort,
            'dir' => $dir,
        ];
    }

    /**
     * @return array{columns: array<int, array{key: string, label: string, type: string, sortable: bool}>, rows: array<int, array<string, string>>, summary: array<int, array{label: string, value: string, type: string}>|null, pagination: array<string, mixed>|null, sort: string, dir: string}
     */
    private function profitLossReport(Carbon $from, Carbon $to, ?int $propertyId, ?int $unitId, ReportTableParams $table): array
    {
        $rentCollected = (string) $this->scopeByLease(
            Payment::query()
                ->where('status', PaymentStatus::Completed->value)
                ->whereBetween('payment_date', [$from->toDateString(), $to->toDateString()]),
            $propertyId,
            $unitId,
        )->sum('amount');

        $incomeRows = collect([['category' => 'Rent', 'amount' => $rentCollected]]);

        // Transactions are property-level, not unit-level — see incomeReport().
        if ($unitId === null) {
            $incomeRows = $incomeRows->concat($this->metrics->categoryBreakdown(TransactionType::Income, $propertyId, $from, $to));
        }

        $incomeRows = $incomeRows->map(fn (array $row): array => ['type' => 'Income', 'category' => $row['category'], 'amount' => $row['amount']]);

        $expenseRows = $unitId === null
            ? collect($this->metrics->categoryBreakdown(TransactionType::Expense, $propertyId, $from, $to))
                ->map(fn (array $row): array => ['type' => 'Expense', 'category' => $row['category'], 'amount' => $row['amount']])
            : collect();

        $totalIncome = $incomeRows->sum(fn (array $row) => (float) $row['amount']);
        $totalExpense = $expenseRows->sum(fn (array $row) => (float) $row['amount']);

        $sort = in_array($table->sort, ['type', 'category', 'amount'], true) ? $table->sort : '';
        $effectiveTable = new ReportTableParams($table->page, $table->perPage, $sort, $table->dir, $table->search);

        /** @var Collection<int, array<string, string>> $profitLossRows */
        $profitLossRows = $incomeRows->concat($expenseRows);

        [$rows, $pagination] = $this->searchSortPaginate(
            $profitLossRows,
            $effectiveTable,
            ['type', 'category'],
            ['amount'],
        );

        return [
            'columns' => [
                ['key' => 'type', 'label' => 'Type', 'type' => 'text', 'sortable' => true],
                ['key' => 'category', 'label' => 'Category', 'type' => 'text', 'sortable' => true],
                ['key' => 'amount', 'label' => 'Amount', 'type' => 'currency', 'sortable' => true],
            ],
            'rows' => $rows,
            'summary' => [
                ['label' => 'Total income', 'value' => (string) $totalIncome, 'type' => 'currency'],
                ['label' => 'Total expenses', 'value' => (string) $totalExpense, 'type' => 'currency'],
                ['label' => 'Net profit', 'value' => (string) ($totalIncome - $totalExpense), 'type' => 'currency'],
            ],
            'pagination' => $pagination,
            'sort' => $sort,
            'dir' => $table->dir,
        ];
    }

    /**
     * @return array{columns: array<int, array{key: string, label: string, type: string, sortable: bool}>, rows: array<int, array<string, string>>, summary: array<int, array{label: string, value: string, type: string}>|null, pagination: array<string, mixed>|null, sort: string, dir: string}
     */
    private function rentCollectionReport(Carbon $from, Carbon $to, ?int $propertyId, ?int $unitId, ReportTableParams $table): array
    {
        $sortColumns = [
            'property' => 'properties.name',
            'billed' => 'billed',
            'collected' => 'collected',
        ];
        $sort = array_key_exists($table->sort, $sortColumns) ? $table->sort : 'property';
        $dir = $table->sort === '' ? 'asc' : $table->dir;

        $query = Property::query()
            ->when($propertyId !== null, fn (Builder $q) => $q->whereKey($propertyId))
            ->select('properties.*')
            ->selectSub(function (QueryBuilder $q) use ($from, $to, $unitId): void {
                $q->from('payment_schedules')
                    ->selectRaw('COALESCE(SUM(amount_expected), 0)')
                    ->join('leases', 'leases.id', '=', 'payment_schedules.lease_id')
                    ->join('units', 'units.id', '=', 'leases.unit_id')
                    ->whereColumn('units.property_id', 'properties.id')
                    ->whereBetween('payment_schedules.period_start', [$from->toDateString(), $to->toDateString()])
                    ->when($unitId !== null, fn (QueryBuilder $q2) => $q2->where('leases.unit_id', $unitId));
            }, 'billed')
            ->selectSub(function (QueryBuilder $q) use ($from, $to, $unitId): void {
                $q->from('payments')
                    ->selectRaw('COALESCE(SUM(amount), 0)')
                    ->join('leases', 'leases.id', '=', 'payments.lease_id')
                    ->join('units', 'units.id', '=', 'leases.unit_id')
                    ->whereColumn('units.property_id', 'properties.id')
                    ->where('payments.status', PaymentStatus::Completed->value)
                    ->whereBetween('payments.payment_date', [$from->toDateString(), $to->toDateString()])
                    ->when($unitId !== null, fn (QueryBuilder $q2) => $q2->where('leases.unit_id', $unitId));
            }, 'collected');

        if ($table->search !== '') {
            $query->where('properties.name', 'like', "%{$table->search}%");
        }

        $query->orderBy($sortColumns[$sort], $dir)->orderBy('properties.id');

        [$rows, $pagination] = $this->fetchRows($query, $table, function (Property $property): array {
            $billed = (float) $property->getAttribute('billed');
            $collected = (float) $property->getAttribute('collected');

            return [
                'property' => $property->name,
                'billed' => (string) $billed,
                'collected' => (string) $collected,
                'rate' => $billed > 0 ? round($collected / $billed * 100, 1).'%' : '—',
            ];
        });

        return [
            'columns' => [
                ['key' => 'property', 'label' => 'Property', 'type' => 'text', 'sortable' => true],
                ['key' => 'billed', 'label' => 'Billed', 'type' => 'currency', 'sortable' => true],
                ['key' => 'collected', 'label' => 'Collected', 'type' => 'currency', 'sortable' => true],
                ['key' => 'rate', 'label' => 'Collection rate', 'type' => 'text', 'sortable' => false],
            ],
            'rows' => $rows,
            'summary' => null,
            'pagination' => $pagination,
            'sort' => $sort,
            'dir' => $dir,
        ];
    }

    /**
     * @return array{columns: array<int, array{key: string, label: string, type: string, sortable: bool}>, rows: array<int, array<string, string>>, summary: array<int, array{label: string, value: string, type: string}>|null, pagination: array<string, mixed>|null, sort: string, dir: string}
     */
    private function rentArrearsReport(?int $propertyId, ?int $unitId, ReportTableParams $table): array
    {
        $today = Carbon::today();

        $sortColumns = [
            'unit' => 'units.name',
            'property' => 'properties.name',
            'period' => 'payment_schedules.period_start',
            'status' => 'payment_schedules.status',
        ];
        $sort = array_key_exists($table->sort, $sortColumns) ? $table->sort : 'period';
        $dir = $table->sort === '' ? 'asc' : $table->dir;

        $query = $this->scopeByLease(PaymentSchedule::overdue(), $propertyId, $unitId)
            ->leftJoin('leases', 'leases.id', '=', 'payment_schedules.lease_id')
            ->leftJoin('units', 'units.id', '=', 'leases.unit_id')
            ->leftJoin('properties', 'properties.id', '=', 'units.property_id')
            ->select('payment_schedules.*')
            ->withSum(
                ['payments as paid_amount' => fn (Builder $q) => $q->where('status', PaymentStatus::Completed->value)],
                'amount',
            )
            ->with(['lease.unit.property', 'lease.tenants']);

        if ($table->search !== '') {
            $needle = "%{$table->search}%";
            $query->where(fn (Builder $q) => $q
                ->whereHas('lease.tenants', fn (Builder $t) => $t->where('name', 'like', $needle))
                ->orWhere('units.name', 'like', $needle)
                ->orWhere('properties.name', 'like', $needle));
        }

        $query->orderBy($sortColumns[$sort], $dir)->orderBy('payment_schedules.id');

        [$rows, $pagination] = $this->fetchRows($query, $table, function (PaymentSchedule $schedule) use ($today): array {
            $balance = max(0.0, (float) $schedule->amount_expected - (float) ($schedule->paid_amount ?? 0));

            return [
                'tenant' => $this->tenantNames($schedule->lease?->tenants),
                'unit' => $schedule->lease?->unit->name ?? '—',
                'property' => $schedule->lease?->unit?->property->name ?? '—',
                'period' => "{$schedule->period_start->toDateString()} – {$schedule->period_end->toDateString()}",
                'amount_due' => (string) $balance,
                'days_overdue' => (string) $schedule->period_start->diffInDays($today),
                'status' => $schedule->status->label(),
            ];
        });

        // Overdue balance total, independent of the current search/page.
        $summaryQuery = $this->scopeByLease(PaymentSchedule::overdue(), $propertyId, $unitId)
            ->withSum(
                ['payments as paid_amount' => fn (Builder $q) => $q->where('status', PaymentStatus::Completed->value)],
                'amount',
            );
        $totalOverdue = $summaryQuery->get()->sum(
            fn (PaymentSchedule $schedule) => max(0.0, (float) $schedule->amount_expected - (float) ($schedule->paid_amount ?? 0)),
        );

        return [
            'columns' => [
                ['key' => 'tenant', 'label' => 'Tenant', 'type' => 'text', 'sortable' => false],
                ['key' => 'unit', 'label' => 'Unit', 'type' => 'text', 'sortable' => true],
                ['key' => 'property', 'label' => 'Property', 'type' => 'text', 'sortable' => true],
                ['key' => 'period', 'label' => 'Period', 'type' => 'text', 'sortable' => true],
                ['key' => 'amount_due', 'label' => 'Amount due', 'type' => 'currency', 'sortable' => false],
                ['key' => 'days_overdue', 'label' => 'Days overdue', 'type' => 'number', 'sortable' => false],
                ['key' => 'status', 'label' => 'Status', 'type' => 'text', 'sortable' => true],
            ],
            'rows' => $rows,
            'summary' => [
                ['label' => 'Total overdue', 'value' => (string) $totalOverdue, 'type' => 'currency'],
            ],
            'pagination' => $pagination,
            'sort' => $sort,
            'dir' => $dir,
        ];
    }

    /**
     * @return array{columns: array<int, array{key: string, label: string, type: string, sortable: bool}>, rows: array<int, array<string, string>>, summary: array<int, array{label: string, value: string, type: string}>|null, pagination: array<string, mixed>|null, sort: string, dir: string}
     */
    private function advancePaymentsReport(?int $propertyId, ?int $unitId, ReportTableParams $table): array
    {
        $today = Carbon::today();

        $sortColumns = [
            'unit' => 'units.name',
            'property' => 'properties.name',
            'period' => 'payment_schedules.period_start',
            'amount_paid' => 'payment_schedules.amount_expected',
        ];
        $sort = array_key_exists($table->sort, $sortColumns) ? $table->sort : 'period';
        $dir = $table->sort === '' ? 'asc' : $table->dir;

        $query = $this->scopeByLease(
            PaymentSchedule::query()
                ->where('payment_schedules.status', PaymentScheduleStatus::Paid->value)
                ->where('payment_schedules.period_start', '>', $today->toDateString()),
            $propertyId,
            $unitId,
        )
            ->leftJoin('leases', 'leases.id', '=', 'payment_schedules.lease_id')
            ->leftJoin('units', 'units.id', '=', 'leases.unit_id')
            ->leftJoin('properties', 'properties.id', '=', 'units.property_id')
            ->select('payment_schedules.*')
            ->with(['lease.unit.property', 'lease.tenants']);

        if ($table->search !== '') {
            $needle = "%{$table->search}%";
            $query->where(fn (Builder $q) => $q
                ->whereHas('lease.tenants', fn (Builder $t) => $t->where('name', 'like', $needle))
                ->orWhere('units.name', 'like', $needle)
                ->orWhere('properties.name', 'like', $needle));
        }

        $query->orderBy($sortColumns[$sort], $dir)->orderBy('payment_schedules.id');

        [$rows, $pagination] = $this->fetchRows($query, $table, fn (PaymentSchedule $schedule): array => [
            'tenant' => $this->tenantNames($schedule->lease?->tenants),
            'unit' => $schedule->lease?->unit->name ?? '—',
            'property' => $schedule->lease?->unit?->property->name ?? '—',
            'period' => "{$schedule->period_start->toDateString()} – {$schedule->period_end->toDateString()}",
            'amount_paid' => (string) $schedule->amount_expected,
        ]);

        return [
            'columns' => [
                ['key' => 'tenant', 'label' => 'Tenant', 'type' => 'text', 'sortable' => false],
                ['key' => 'unit', 'label' => 'Unit', 'type' => 'text', 'sortable' => true],
                ['key' => 'property', 'label' => 'Property', 'type' => 'text', 'sortable' => true],
                ['key' => 'period', 'label' => 'Prepaid period', 'type' => 'text', 'sortable' => true],
                ['key' => 'amount_paid', 'label' => 'Amount', 'type' => 'currency', 'sortable' => true],
            ],
            'rows' => $rows,
            'summary' => null,
            'pagination' => $pagination,
            'sort' => $sort,
            'dir' => $dir,
        ];
    }

    /**
     * @return array{columns: array<int, array{key: string, label: string, type: string, sortable: bool}>, rows: array<int, array<string, string>>, summary: array<int, array{label: string, value: string, type: string}>|null, pagination: array<string, mixed>|null, sort: string, dir: string}
     */
    private function tenantRosterReport(?int $propertyId, ?int $unitId, ReportTableParams $table): array
    {
        // Untyped: whereHas() passes this a plain Builder, but the with()
        // eager-load constraint below passes a BelongsToMany relation
        // instance instead — both forward where()/whereHas() the same way.
        $activeLease = function ($q) use ($propertyId, $unitId): void {
            $q->where('status', LeaseStatus::Active->value);

            if ($unitId !== null) {
                $q->where('unit_id', $unitId);
            } elseif ($propertyId !== null) {
                $q->whereHas('unit', fn (Builder $q2) => $q2->where('property_id', $propertyId));
            }
        };

        $sortColumns = [
            'tenant' => 'name',
            'email' => 'email',
            'phone' => 'phone',
        ];
        $sort = array_key_exists($table->sort, $sortColumns) ? $table->sort : 'tenant';
        $dir = $table->sort === '' ? 'asc' : $table->dir;

        $query = Tenant::query()
            ->whereHas('leases', $activeLease)
            ->with(['leases' => function ($q) use ($activeLease): void {
                $activeLease($q);
                $q->with('unit.property');
            }]);

        if ($table->search !== '') {
            $needle = "%{$table->search}%";
            $query->where(fn (Builder $q) => $q->where('name', 'like', $needle)
                ->orWhere('email', 'like', $needle)
                ->orWhere('phone', 'like', $needle)
                ->orWhereHas('leases', function (Builder $q2) use ($activeLease, $needle): void {
                    $activeLease($q2);
                    $q2->where(fn (Builder $q3) => $q3->whereHas('unit', fn (Builder $u) => $u->where('name', 'like', $needle)
                        ->orWhereHas('property', fn (Builder $p) => $p->where('name', 'like', $needle))));
                }));
        }

        $query->orderBy($sortColumns[$sort], $dir)->orderBy('id');

        [$rows, $pagination] = $this->fetchRows($query, $table, function (Tenant $tenant): array {
            $lease = $tenant->leases->first();

            return [
                'tenant' => $tenant->name,
                'email' => $tenant->email ?? '—',
                'phone' => $tenant->phone ?? '—',
                'unit' => $lease?->unit->name ?? '—',
                'property' => $lease?->unit?->property->name ?? '—',
                'lease_status' => $lease !== null ? $lease->status->label() : '—',
            ];
        });

        return [
            'columns' => [
                ['key' => 'tenant', 'label' => 'Tenant', 'type' => 'text', 'sortable' => true],
                ['key' => 'email', 'label' => 'Email', 'type' => 'text', 'sortable' => true],
                ['key' => 'phone', 'label' => 'Phone', 'type' => 'text', 'sortable' => true],
                ['key' => 'unit', 'label' => 'Unit', 'type' => 'text', 'sortable' => false],
                ['key' => 'property', 'label' => 'Property', 'type' => 'text', 'sortable' => false],
                ['key' => 'lease_status', 'label' => 'Lease status', 'type' => 'text', 'sortable' => false],
            ],
            'rows' => $rows,
            'summary' => null,
            'pagination' => $pagination,
            'sort' => $sort,
            'dir' => $dir,
        ];
    }

    /**
     * @return array{columns: array<int, array{key: string, label: string, type: string, sortable: bool}>, rows: array<int, array<string, string>>, summary: array<int, array{label: string, value: string, type: string}>|null, pagination: array<string, mixed>|null, sort: string, dir: string}
     */
    private function newResidentsReport(Carbon $from, Carbon $to, ?int $propertyId, ?int $unitId, ReportTableParams $table): array
    {
        $sortColumns = [
            'unit' => 'units.name',
            'property' => 'properties.name',
            'move_in' => 'leases.start_date',
            'rent' => 'leases.rent_amount',
        ];
        $sort = array_key_exists($table->sort, $sortColumns) ? $table->sort : 'move_in';
        $dir = $table->sort === '' ? 'asc' : $table->dir;

        $query = $this->scopeLeases(
            Lease::query()->whereBetween('start_date', [$from->toDateString(), $to->toDateString()]),
            $propertyId,
            $unitId,
        )
            ->leftJoin('units', 'units.id', '=', 'leases.unit_id')
            ->leftJoin('properties', 'properties.id', '=', 'units.property_id')
            ->select('leases.*')
            ->with(['unit.property', 'tenants']);

        if ($table->search !== '') {
            $needle = "%{$table->search}%";
            $query->where(fn (Builder $q) => $q
                ->whereHas('tenants', fn (Builder $t) => $t->where('name', 'like', $needle))
                ->orWhere('units.name', 'like', $needle)
                ->orWhere('properties.name', 'like', $needle));
        }

        $query->orderBy($sortColumns[$sort], $dir)->orderBy('leases.id');

        [$rows, $pagination] = $this->fetchRows($query, $table, fn (Lease $lease): array => [
            'tenant' => $this->tenantNames($lease->tenants),
            'unit' => $lease->unit->name ?? '—',
            'property' => $lease->unit?->property->name ?? '—',
            'move_in' => $lease->start_date->toDateString(),
            'rent' => (string) $lease->rent_amount,
        ]);

        return [
            'columns' => [
                ['key' => 'tenant', 'label' => 'Tenant', 'type' => 'text', 'sortable' => false],
                ['key' => 'unit', 'label' => 'Unit', 'type' => 'text', 'sortable' => true],
                ['key' => 'property', 'label' => 'Property', 'type' => 'text', 'sortable' => true],
                ['key' => 'move_in', 'label' => 'Move-in date', 'type' => 'date', 'sortable' => true],
                ['key' => 'rent', 'label' => 'Rent', 'type' => 'currency', 'sortable' => true],
            ],
            'rows' => $rows,
            'summary' => null,
            'pagination' => $pagination,
            'sort' => $sort,
            'dir' => $dir,
        ];
    }

    /**
     * @return array{columns: array<int, array{key: string, label: string, type: string, sortable: bool}>, rows: array<int, array<string, string>>, summary: array<int, array{label: string, value: string, type: string}>|null, pagination: array<string, mixed>|null, sort: string, dir: string}
     */
    private function expiringLeasesReport(?int $propertyId, ?int $unitId, ReportTableParams $table): array
    {
        $today = Carbon::today();
        $horizon = $today->copy()->addDays(90);

        $sortColumns = [
            'unit' => 'units.name',
            'property' => 'properties.name',
            'end_date' => 'leases.end_date',
            'rent' => 'leases.rent_amount',
        ];
        $sort = array_key_exists($table->sort, $sortColumns) ? $table->sort : 'end_date';
        $dir = $table->sort === '' ? 'asc' : $table->dir;

        $query = $this->scopeLeases(
            Lease::query()
                ->where('leases.status', LeaseStatus::Active->value)
                ->whereBetween('leases.end_date', [$today->toDateString(), $horizon->toDateString()]),
            $propertyId,
            $unitId,
        )
            ->leftJoin('units', 'units.id', '=', 'leases.unit_id')
            ->leftJoin('properties', 'properties.id', '=', 'units.property_id')
            ->select('leases.*')
            ->with(['unit.property', 'tenants']);

        if ($table->search !== '') {
            $needle = "%{$table->search}%";
            $query->where(fn (Builder $q) => $q
                ->whereHas('tenants', fn (Builder $t) => $t->where('name', 'like', $needle))
                ->orWhere('units.name', 'like', $needle)
                ->orWhere('properties.name', 'like', $needle));
        }

        $query->orderBy($sortColumns[$sort], $dir)->orderBy('leases.id');

        [$rows, $pagination] = $this->fetchRows($query, $table, fn (Lease $lease): array => [
            'tenant' => $this->tenantNames($lease->tenants),
            'unit' => $lease->unit->name ?? '—',
            'property' => $lease->unit?->property->name ?? '—',
            'end_date' => $lease->end_date->toDateString(),
            'days_remaining' => (string) $today->diffInDays($lease->end_date),
            'rent' => (string) $lease->rent_amount,
        ]);

        return [
            'columns' => [
                ['key' => 'tenant', 'label' => 'Tenant', 'type' => 'text', 'sortable' => false],
                ['key' => 'unit', 'label' => 'Unit', 'type' => 'text', 'sortable' => true],
                ['key' => 'property', 'label' => 'Property', 'type' => 'text', 'sortable' => true],
                ['key' => 'end_date', 'label' => 'End date', 'type' => 'date', 'sortable' => true],
                ['key' => 'days_remaining', 'label' => 'Days remaining', 'type' => 'number', 'sortable' => false],
                ['key' => 'rent', 'label' => 'Rent', 'type' => 'currency', 'sortable' => true],
            ],
            'rows' => $rows,
            'summary' => null,
            'pagination' => $pagination,
            'sort' => $sort,
            'dir' => $dir,
        ];
    }

    /**
     * @return array{columns: array<int, array{key: string, label: string, type: string, sortable: bool}>, rows: array<int, array<string, string>>, summary: array<int, array{label: string, value: string, type: string}>|null, pagination: array<string, mixed>|null, sort: string, dir: string}
     */
    private function vacanciesReport(?int $propertyId, ?int $unitId, ReportTableParams $table): array
    {
        $sortColumns = [
            'unit' => 'units.name',
            'property' => 'properties.name',
            'unit_type' => 'unit_types.label',
        ];
        $sort = array_key_exists($table->sort, $sortColumns) ? $table->sort : 'unit';
        $dir = $table->sort === '' ? 'asc' : $table->dir;

        $query = Unit::query()
            ->where('units.status', UnitStatus::Vacant->value)
            ->when($unitId !== null, fn (Builder $q) => $q->whereKey($unitId))
            ->when($unitId === null && $propertyId !== null, fn (Builder $q) => $q->where('units.property_id', $propertyId))
            ->leftJoin('properties', 'properties.id', '=', 'units.property_id')
            ->leftJoin('unit_types', 'unit_types.id', '=', 'units.unit_type_id')
            ->select('units.*')
            ->with(['property', 'unitType', 'currentPrice']);

        if ($table->search !== '') {
            $needle = "%{$table->search}%";
            $query->where(fn (Builder $q) => $q->where('units.name', 'like', $needle)
                ->orWhere('properties.name', 'like', $needle)
                ->orWhere('unit_types.label', 'like', $needle));
        }

        $query->orderBy($sortColumns[$sort], $dir)->orderBy('units.id');

        [$rows, $pagination] = $this->fetchRows($query, $table, fn (Unit $unit): array => [
            'unit' => $unit->name,
            'property' => $unit->property->name ?? '—',
            'unit_type' => $unit->unitType->label ?? '—',
            'potential_rent' => $unit->currentPrice !== null ? (string) $unit->currentPrice->amount : '—',
        ]);

        return [
            'columns' => [
                ['key' => 'unit', 'label' => 'Unit', 'type' => 'text', 'sortable' => true],
                ['key' => 'property', 'label' => 'Property', 'type' => 'text', 'sortable' => true],
                ['key' => 'unit_type', 'label' => 'Unit type', 'type' => 'text', 'sortable' => true],
                ['key' => 'potential_rent', 'label' => 'Potential rent', 'type' => 'currency', 'sortable' => false],
            ],
            'rows' => $rows,
            'summary' => null,
            'pagination' => $pagination,
            'sort' => $sort,
            'dir' => $dir,
        ];
    }

    /**
     * @return array{columns: array<int, array{key: string, label: string, type: string, sortable: bool}>, rows: array<int, array<string, string>>, summary: array<int, array{label: string, value: string, type: string}>|null, pagination: array<string, mixed>|null, sort: string, dir: string}
     */
    private function depositsReport(?int $propertyId, ?int $unitId, ReportTableParams $table): array
    {
        $sortColumns = [
            'unit' => 'units.name',
            'property' => 'properties.name',
            'deposit' => 'leases.security_deposit',
        ];
        $sort = array_key_exists($table->sort, $sortColumns) ? $table->sort : 'unit';
        $dir = $table->sort === '' ? 'asc' : $table->dir;

        $base = $this->scopeLeases(
            Lease::query()->where('leases.status', LeaseStatus::Active->value),
            $propertyId,
            $unitId,
        );

        $summaryTotal = (clone $base)->sum('security_deposit');

        $query = $base
            ->leftJoin('units', 'units.id', '=', 'leases.unit_id')
            ->leftJoin('properties', 'properties.id', '=', 'units.property_id')
            ->select('leases.*')
            ->with(['unit.property', 'tenants']);

        if ($table->search !== '') {
            $needle = "%{$table->search}%";
            $query->where(fn (Builder $q) => $q
                ->whereHas('tenants', fn (Builder $t) => $t->where('name', 'like', $needle))
                ->orWhere('units.name', 'like', $needle)
                ->orWhere('properties.name', 'like', $needle));
        }

        $query->orderBy($sortColumns[$sort], $dir)->orderBy('leases.id');

        [$rows, $pagination] = $this->fetchRows($query, $table, fn (Lease $lease): array => [
            'tenant' => $this->tenantNames($lease->tenants),
            'unit' => $lease->unit->name ?? '—',
            'property' => $lease->unit?->property->name ?? '—',
            'deposit' => $lease->security_deposit !== null ? (string) $lease->security_deposit : '0',
            'status' => $lease->security_deposit !== null ? 'Held' : 'None',
        ]);

        return [
            'columns' => [
                ['key' => 'tenant', 'label' => 'Tenant', 'type' => 'text', 'sortable' => false],
                ['key' => 'unit', 'label' => 'Unit', 'type' => 'text', 'sortable' => true],
                ['key' => 'property', 'label' => 'Property', 'type' => 'text', 'sortable' => true],
                ['key' => 'deposit', 'label' => 'Deposit', 'type' => 'currency', 'sortable' => true],
                ['key' => 'status', 'label' => 'Status', 'type' => 'text', 'sortable' => false],
            ],
            'rows' => $rows,
            'summary' => [
                ['label' => 'Total held', 'value' => (string) $summaryTotal, 'type' => 'currency'],
            ],
            'pagination' => $pagination,
            'sort' => $sort,
            'dir' => $dir,
        ];
    }

    /**
     * @param  Collection<int, Tenant>|null  $tenants
     */
    private function tenantNames(?Collection $tenants): string
    {
        if ($tenants === null || $tenants->isEmpty()) {
            return '—';
        }

        return $tenants->pluck('name')->join(', ');
    }
}
