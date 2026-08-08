<?php

namespace App\Console\Commands;

use App\Enums\LeaseStatus;
use App\Enums\PaymentScheduleStatus;
use App\Models\Lease;
use App\Models\PaymentSchedule;
use App\Models\User;
use App\Notifications\Concerns\HasSmsBody;
use App\Notifications\RentDueSoon;
use App\Notifications\RentOverdue;
use App\Services\AfricasTalkingSmsService;
use App\Services\PaymentScheduleGenerator;
use App\Settings\BillingSettings;
use App\Settings\GeneralSettings;
use App\Settings\NotificationSettings;
use App\Settings\SmsSettings;
use Closure;
use Illuminate\Console\Command;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\Notification as NotificationFacade;

class SyncPaymentSchedules extends Command
{
    protected $signature = 'app:sync-payment-schedules';

    protected $description = 'Top up each active lease\'s payment schedule and send rent due/overdue reminders.';

    public function handle(
        PaymentScheduleGenerator $generator,
        BillingSettings $billing,
        GeneralSettings $general,
        NotificationSettings $notifications,
        SmsSettings $sms,
        AfricasTalkingSmsService $smsService,
    ): int {
        Lease::query()->where('status', LeaseStatus::Active->value)->each(
            fn (Lease $lease) => $generator->generate($lease)
        );

        $staff = User::role(['Super Admin', 'Manager'])->get();
        $dueSoon = 0;
        $overdue = 0;

        PaymentSchedule::query()
            ->where('status', PaymentScheduleStatus::Pending->value)
            ->whereNull('last_due_reminder_sent_at')
            ->whereDate('period_start', '>=', Date::today())
            ->whereDate('period_start', '<=', Date::today()->addDays($billing->rent_reminder_days_before))
            ->with('lease.unit.property.landlord.landlordDetail')
            ->each(function (PaymentSchedule $schedule) use (&$dueSoon, $general, $notifications, $sms, $smsService, $staff): void {
                $this->dispatch(
                    $schedule,
                    fn (array $channels) => new RentDueSoon($schedule, $general->default_currency, $channels),
                    $notifications,
                    $sms,
                    $smsService,
                    $staff,
                );

                $schedule->forceFill(['last_due_reminder_sent_at' => Date::now()])->save();
                $dueSoon++;
            });

        PaymentSchedule::query()
            ->overdue()
            ->with('lease.unit.property.landlord.landlordDetail')
            ->get()
            ->filter(fn (PaymentSchedule $schedule) => $this->isDueForOverdueReminder($schedule, $billing))
            ->each(function (PaymentSchedule $schedule) use (&$overdue, $general, $notifications, $sms, $smsService, $staff): void {
                $this->dispatch(
                    $schedule,
                    fn (array $channels) => new RentOverdue($schedule, $general->default_currency, $channels),
                    $notifications,
                    $sms,
                    $smsService,
                    $staff,
                );

                $schedule->forceFill(['last_overdue_reminder_sent_at' => Date::now()])->save();
                $overdue++;
            });

        $this->info("Sent {$dueSoon} due-soon and {$overdue} overdue rent reminder(s).");

        return self::SUCCESS;
    }

    private function isDueForOverdueReminder(PaymentSchedule $schedule, BillingSettings $billing): bool
    {
        $daysOverdue = $schedule->period_start->diffInDays(Date::now());

        if ($daysOverdue < $billing->rent_overdue_reminder_days_after) {
            return false;
        }

        if ($schedule->last_overdue_reminder_sent_at === null) {
            return true;
        }

        return $schedule->last_overdue_reminder_sent_at->diffInDays(Date::now()) >= $billing->rent_overdue_reminder_repeat_days;
    }

    /**
     * Notifies the lease's landlord on every enabled channel (in-app always,
     * mail/SMS gated by the global toggles) and Super Admin/Manager staff
     * in-app only, per this session's recipient policy.
     *
     * @param  Closure(array<int, string>): (Notification&HasSmsBody)  $makeNotification
     * @param  Collection<int, User>  $staff
     */
    private function dispatch(
        PaymentSchedule $schedule,
        Closure $makeNotification,
        NotificationSettings $notifications,
        SmsSettings $sms,
        AfricasTalkingSmsService $smsService,
        Collection $staff,
    ): void {
        $landlord = $schedule->lease?->unit?->property?->landlord;

        if ($landlord !== null) {
            $channels = ['database'];

            if ($notifications->email_enabled) {
                $channels[] = 'mail';
            }

            $notification = $makeNotification($channels);
            $landlord->notify($notification);

            $landlordPhone = $landlord->landlordDetail?->phone;

            if ($notifications->sms_enabled && $sms->enabled && $landlordPhone) {
                $smsService->send($landlordPhone, $notification->smsBody());
            }
        }

        if ($staff->isNotEmpty()) {
            NotificationFacade::send($staff, $makeNotification(['database']));
        }
    }
}
