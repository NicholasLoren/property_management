<?php

namespace App\Services;

use App\Enums\LeaseStatus;
use App\Enums\PaymentStatus;
use App\Enums\TransactionType;
use App\Models\Lease;
use App\Models\Payment;
use App\Models\Transaction;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Chart-ready portfolio aggregates shared between the Dashboard (always
 * portfolio-wide) and Reports (filterable by property and date range) —
 * kept in one place so the two never quietly drift apart on how a number
 * is computed.
 */
class PortfolioMetrics
{
    /**
     * Twelve real monthly totals (income vs. expense) — a single month of
     * trend is not a trend, so this always looks back over the trailing
     * year regardless of any date-range filter the caller has, scoped only
     * by property.
     *
     * @return array<int, array{month: string, full_month: string, income: string, expense: string}>
     */
    public function monthlyTrend(?int $propertyId): array
    {
        $months = collect(range(11, 0))->map(fn (int $i) => Carbon::now()->subMonthsNoOverflow($i)->startOfMonth());
        $since = $months->first();

        $paymentsQuery = Payment::query()
            ->where('status', PaymentStatus::Completed->value)
            ->where('payment_date', '>=', $since->toDateString());

        if ($propertyId !== null) {
            $paymentsQuery->whereHas('lease.unit', fn (Builder $q) => $q->where('property_id', $propertyId));
        }

        $payments = $paymentsQuery->get(['payment_date', 'amount']);

        $transactionsQuery = Transaction::query()->where('transaction_date', '>=', $since->toDateString());

        if ($propertyId !== null) {
            $transactionsQuery->where('property_id', $propertyId);
        }

        $transactions = $transactionsQuery->get(['transaction_date', 'amount', 'type']);

        return $months->map(function (Carbon $month) use ($payments, $transactions) {
            $rent = $payments
                ->filter(fn (Payment $p) => $p->payment_date->isSameMonth($month) && $p->payment_date->isSameYear($month))
                ->sum('amount');

            $monthTransactions = $transactions->filter(
                fn (Transaction $t) => $t->transaction_date->isSameMonth($month) && $t->transaction_date->isSameYear($month),
            );

            $income = $rent + $monthTransactions->where('type', TransactionType::Income)->sum('amount');
            $expense = $monthTransactions->where('type', TransactionType::Expense)->sum('amount');

            return [
                'month' => $month->format('M'),
                'full_month' => $month->format('M Y'),
                'income' => (string) $income,
                'expense' => (string) $expense,
            ];
        })->values()->all();
    }

    /**
     * @return array<int, array{category: string, amount: string}>
     */
    public function categoryBreakdown(TransactionType $type, ?int $propertyId, Carbon $from, Carbon $to): array
    {
        $query = Transaction::query()
            ->where('type', $type->value)
            ->whereBetween('transaction_date', [$from->toDateString(), $to->toDateString()])
            ->with('category');

        if ($propertyId !== null) {
            $query->where('property_id', $propertyId);
        }

        /** @var Collection<string, Collection<int, Transaction>> $grouped */
        $grouped = $query->get()->groupBy(fn (Transaction $t) => $t->category !== null ? $t->category->name : 'Uncategorized');

        return $grouped
            ->map(fn (Collection $group, string $name): array => ['category' => $name, 'amount' => (string) $group->sum('amount')])
            ->sortByDesc(fn (array $row) => (float) $row['amount'])
            ->values()
            ->all();
    }

    /**
     * @return array<int, array{status: string, status_label: string, count: int}>
     */
    public function leaseStatusDistribution(?int $propertyId): array
    {
        $query = Lease::query();

        if ($propertyId !== null) {
            $query->whereHas('unit', fn (Builder $q) => $q->where('property_id', $propertyId));
        }

        $counts = $query->selectRaw('status, count(*) as count')->groupBy('status')->pluck('count', 'status');

        return collect(LeaseStatus::cases())
            ->map(fn (LeaseStatus $status): array => [
                'status' => $status->value,
                'status_label' => $status->label(),
                'count' => (int) $counts->get($status->value, 0),
            ])
            ->all();
    }
}
