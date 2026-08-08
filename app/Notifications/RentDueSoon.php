<?php

namespace App\Notifications;

use App\Models\PaymentSchedule;
use App\Models\User;
use App\Notifications\Concerns\HasSmsBody;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class RentDueSoon extends Notification implements HasSmsBody, ShouldQueue
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

        return (new MailMessage)
            ->subject('Rent due soon — '.$this->unitLabel())
            ->greeting("Hi {$notifiable->name},")
            ->line("Rent for {$this->unitLabel()} is due on {$this->schedule->period_start->format('j M Y')}.")
            ->line("Amount due: {$this->currency} ".number_format((float) $this->schedule->amount_expected))
            ->when($lease !== null, fn (MailMessage $mail) => $mail->action('View lease', route('leases.show', $lease)))
            ->line('This is an automated reminder — no action is needed if the payment has already been recorded.');
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'rent_due_soon',
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

        return "Rent due {$due}: {$this->currency} {$amount} for {$this->unitLabel()}.";
    }

    private function unitLabel(): string
    {
        $unit = $this->schedule->lease?->unit;

        return $unit !== null ? "{$unit->name} ({$unit->property?->name})" : "lease #{$this->schedule->lease_id}";
    }
}
