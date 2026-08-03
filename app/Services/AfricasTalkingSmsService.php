<?php

namespace App\Services;

use App\Settings\SmsSettings;
use Illuminate\Support\Facades\Http;

class AfricasTalkingSmsService
{
    public function __construct(private readonly SmsSettings $settings) {}

    /**
     * @return array{success: bool, message: string}
     */
    public function send(string $to, string $message): array
    {
        if (! $this->settings->enabled) {
            return ['success' => false, 'message' => 'SMS is not enabled in settings.'];
        }

        if ($this->settings->africastalking_username === '' || $this->settings->africastalking_api_key === '') {
            return ['success' => false, 'message' => 'Africa\'s Talking username or API key is not configured.'];
        }

        $response = Http::asForm()
            ->withHeaders([
                'apiKey' => $this->settings->africastalking_api_key,
                'Accept' => 'application/json',
            ])
            ->post($this->baseUrl().'/version1/messaging', array_filter([
                'username' => $this->settings->africastalking_username,
                'to' => $to,
                'message' => $message,
                'from' => $this->settings->sender_id ?: null,
            ]));

        if (! $response->successful()) {
            return ['success' => false, 'message' => "Africa's Talking request failed ({$response->status()})."];
        }

        /** @var array<int, array{status: string}> $recipients */
        $recipients = $response->json('SMSMessageData.Recipients', []);
        $failed = collect($recipients)->first(fn (array $recipient) => $recipient['status'] !== 'Success');

        if ($failed) {
            return ['success' => false, 'message' => $failed['status']];
        }

        return ['success' => true, 'message' => 'Message sent.'];
    }

    private function baseUrl(): string
    {
        return $this->settings->sandbox
            ? 'https://api.sandbox.africastalking.com'
            : 'https://api.africastalking.com';
    }
}
