<?php

namespace App\Notifications;

use App\Models\PaymentSchedule;
use App\Models\User;
use App\Notifications\Concerns\HasSmsBody;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Date;

class RentOverdue extends Notification implements HasSmsBody, ShouldQueue
{
    use Queueable;

    /**
     * @param  array<int, string>  $channels  e.g. ['database'] for an
     *                                        in-app-only recipient, or
     *                                        ['mail', 'database'] when email
     *                                        is enabled for this recipient.
     */
    public function __construct(
        private readonly PaymentSchedule $schedule,
        private readonly string $currency,
        private readonly array $channels = ['mail', 'database'],
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return $this->channels;
    }

    public function toMail(User $notifiable): MailMessage
    {
        $lease = $this->schedule->lease;
        $daysOverdue = $this->schedule->period_start->diffInDays(Date::now());

        return (new MailMessage)
            ->subject('Rent overdue — '.$this->unitLabel())
            ->greeting("Hi {$notifiable->name},")
            ->line("Rent for {$this->unitLabel()} was due on {$this->schedule->period_start->format('j M Y')} and is now {$daysOverdue} day(s) overdue.")
            ->line("Amount outstanding: {$this->currency} ".number_format((float) $this->schedule->amount_expected))
            ->when($lease !== null, fn (MailMessage $mail) => $mail->action('View lease', route('leases.show', $lease)))
            ->line('Please follow up with the tenant, or record the payment if it has already been collected.');
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'rent_overdue',
            'payment_schedule_id' => $this->schedule->id,
            'lease_id' => $this->schedule->lease_id,
            'unit_label' => $this->unitLabel(),
            'amount_expected' => (string) $this->schedule->amount_expected,
            'due_date' => $this->schedule->period_start->toDateString(),
        ];
    }

    public function smsBody(): string
    {
        $amount = number_format((float) $this->schedule->amount_expected);
        $due = $this->schedule->period_start->format('j M');

        return "OVERDUE since {$due}: {$this->currency} {$amount} for {$this->unitLabel()}. Please follow up.";
    }

    private function unitLabel(): string
    {
        $unit = $this->schedule->lease?->unit;

        return $unit !== null ? "{$unit->name} ({$unit->property?->name})" : "lease #{$this->schedule->lease_id}";
    }
}
