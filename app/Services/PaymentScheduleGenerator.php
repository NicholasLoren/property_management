<?php

namespace App\Services;

use App\Enums\LeaseStatus;
use App\Enums\PaymentScheduleStatus;
use App\Models\Lease;
use App\Models\PaymentSchedule;
use App\Settings\BillingSettings;
use Carbon\CarbonInterface;

/**
 * Pre-generates a Lease's expected billing periods — the loan-amortization
 * style schedule that turns "is this lease current" from an inference over
 * bare Payment dates into a lookup. Called both right after a lease becomes
 * Active (so the schedule exists immediately) and daily for every Active
 * lease to top up the horizon as a new year starts — same method either way,
 * since it always resumes from whatever's already been generated.
 */
class PaymentScheduleGenerator
{
    public function __construct(private readonly BillingSettings $settings) {}

    /**
     * Ensure schedule rows exist from wherever generation last left off
     * through `$through` (default: the end of the current calendar year),
     * capped at the lease's own end date.
     */
    public function generate(Lease $lease, ?CarbonInterface $through = null): void
    {
        if ($lease->status !== LeaseStatus::Active) {
            return;
        }

        $through ??= now()->endOfYear();
        $horizon = $lease->end_date->lessThan($through) ? $lease->end_date->copy() : $through->copy();

        $last = $lease->paymentSchedules()->orderByDesc('period_end')->first();
        $cursor = $last !== null ? $last->period_end->copy()->addDay() : $lease->start_date->copy();

        if ($cursor->greaterThan($horizon)) {
            return;
        }

        $interval = $lease->billingIntervalMonths();
        $rows = [];

        // A lease whose due day doesn't match its move-in day gets one
        // short "stub" period first, prorated to the day, before periods
        // align to billing_day going forward.
        if ($last === null && $lease->start_date->day !== $lease->billing_day) {
            $nextDue = $this->nextBillingDate($lease->start_date, $lease->billing_day);
            $periodEnd = $nextDue->copy()->subDay();
            $stubDays = $cursor->diffInDays($periodEnd) + 1;
            $cycleDays = $this->settings->days_in_month * $interval;

            $rows[] = [
                'period_start' => $cursor->copy(),
                'period_end' => $periodEnd,
                'amount_expected' => round(((float) $lease->rent_amount / $cycleDays) * $stubDays, 2),
            ];

            $cursor = $nextDue;
        }

        while ($cursor->lessThanOrEqualTo($horizon)) {
            $periodEnd = $cursor->copy()->addMonthsNoOverflow($interval)->subDay();
            $amount = $lease->rent_amount;

            // The lease's last period is prorated down if its natural cycle
            // end would otherwise run past the lease's own end date.
            if ($periodEnd->greaterThan($lease->end_date)) {
                $cycleDays = $this->settings->days_in_month * $interval;
                $daysInPeriod = $cursor->diffInDays($lease->end_date) + 1;
                $amount = round(((float) $lease->rent_amount / $cycleDays) * $daysInPeriod, 2);
                $periodEnd = $lease->end_date->copy();
            }

            $rows[] = [
                'period_start' => $cursor->copy(),
                'period_end' => $periodEnd,
                'amount_expected' => $amount,
            ];

            $cursor = $periodEnd->copy()->addDay();
        }

        foreach ($rows as $row) {
            PaymentSchedule::create([
                'lease_id' => $lease->id,
                'period_start' => $row['period_start'],
                'period_end' => $row['period_end'],
                'amount_expected' => $row['amount_expected'],
                'status' => PaymentScheduleStatus::Pending,
            ]);
        }
    }

    /**
     * The billing day within a given month, clamped to that month's last
     * day (e.g. a due day of 31 lands on Feb 28/29).
     */
    private function billingDateIn(CarbonInterface $month, int $billingDay): CarbonInterface
    {
        return $month->copy()->startOfMonth()->addDays(min($billingDay, $month->daysInMonth) - 1);
    }

    /**
     * The next occurrence of `billingDay` strictly after `$from`.
     */
    private function nextBillingDate(CarbonInterface $from, int $billingDay): CarbonInterface
    {
        $candidate = $this->billingDateIn($from, $billingDay);

        if ($candidate->lessThanOrEqualTo($from)) {
            $candidate = $this->billingDateIn($from->copy()->addMonthNoOverflow(), $billingDay);
        }

        return $candidate;
    }
}
