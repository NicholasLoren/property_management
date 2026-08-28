<?php

namespace App\Notifications;

use App\Models\LeaseSigningLink;
use App\Notifications\Concerns\HasSmsBody;
use App\Support\Branding;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Sent to a tenant when staff request their signature remotely (see
 * LeaseController::sendSigningLink). Dispatched as an on-demand notification
 * since Tenant isn't Notifiable — tenants have no login accounts.
 */
class LeaseSigningRequested extends Notification implements HasSmsBody, ShouldQueue
{
    use Queueable;

    public function __construct(private readonly LeaseSigningLink $link) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $appName = Branding::name();
        $unit = $this->link->lease->unit;
        $unitLabel = $unit !== null ? "{$unit->name} — {$unit->property?->name}" : "lease #{$this->link->lease_id}";

        return (new MailMessage)
            ->subject("Your tenancy agreement is ready to sign — {$appName}")
            ->greeting("Hi {$this->link->tenant->name},")
            ->line("Your tenancy agreement for {$unitLabel} is ready for your signature.")
            ->action('Review and sign', $this->signingUrl())
            ->line('This link is single-use and expires on '.$this->link->expires_at->toFormattedDateString().'.')
            ->line("If you weren't expecting this, you can safely ignore this email.");
    }

    public function smsBody(): string
    {
        $appName = Branding::name();

        return "{$appName}: your tenancy agreement is ready to sign. {$this->signingUrl()}";
    }

    public function signingUrl(): string
    {
        return route('signing.show', $this->link->token);
    }
}
