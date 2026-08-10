<?php

namespace App\Notifications;

use App\Models\User;
use App\Support\Branding;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Sent right after an admin invites a new user (see UserController::store).
 * The invited account is created with an unusable random password, so this
 * is the invitee's only way in — it carries a real password-reset token
 * (the same one Fortify's "Forgot password?" flow issues) pointed at the
 * app's reset-password page.
 */
class UserInvited extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private readonly string $token) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(User $notifiable): MailMessage
    {
        $appName = Branding::name();
        $url = route('password.reset', [
            'token' => $this->token,
            'email' => $notifiable->email,
        ]);

        return (new MailMessage)
            ->subject("You've been invited to {$appName}")
            ->greeting("Hi {$notifiable->name},")
            ->line("An account has been created for you on {$appName}.")
            ->action('Set your password', $url)
            ->line('This link expires soon for security — if it stops working, use "Forgot password?" on the sign-in page to request a new one.')
            ->line("If you weren't expecting this invitation, you can safely ignore this email.");
    }
}
