<?php

namespace App\Services;

use App\Settings\SmsSettings;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

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

        if ($this->settings->africastalking_api_key === '') {
            return ['success' => false, 'message' => 'Africa\'s Talking API key is not configured.'];
        }

        // The sandbox environment always uses "sandbox" as its username, so
        // a real username is only required for live sending.
        if (! $this->settings->sandbox && $this->settings->africastalking_username === '') {
            return ['success' => false, 'message' => 'Africa\'s Talking username is not configured.'];
        }

        $response = Http::asForm()
            ->withHeaders([
                'apiKey' => $this->settings->africastalking_api_key,
                'Accept' => 'application/json',
            ])
            ->post($this->baseUrl().'/version1/messaging', array_filter([
                // Africa's Talking requires the literal username "sandbox"
                // for every request against its test environment, regardless
                // of the account's real username — using anything else here
                // (even a correct live username/key pair) returns a 401.
                'username' => $this->settings->sandbox ? 'sandbox' : $this->settings->africastalking_username,
                'to' => $to,
                'message' => $message,
                'from' => $this->settings->sender_id ?: null,
            ]));

        if (! $response->successful()) {
            return ['success' => false, 'message' => $this->describeFailure($response)];
        }

        /** @var array<int, array{status: string}> $recipients */
        $recipients = $response->json('SMSMessageData.Recipients', []);
        $failed = collect($recipients)->first(fn (array $recipient) => $recipient['status'] !== 'Success');

        if ($failed) {
            return ['success' => false, 'message' => $failed['status']];
        }

        return ['success' => true, 'message' => 'Message sent.'];
    }

    private function describeFailure(Response $response): string
    {
        if ($response->status() === 401) {
            return "Africa's Talking rejected the API key (401 Unauthorized). ".
                'Make sure the key belongs to the app you\'re testing against — '.
                'sandbox and live use different keys, and the sandbox app is separate from any live app.';
        }

        $body = Str::limit(trim($response->body()), 300);

        if ($body !== '') {
            return "Africa's Talking request failed ({$response->status()}): {$body}";
        }

        return "Africa's Talking request failed ({$response->status()}).";
    }

    private function baseUrl(): string
    {
        return $this->settings->sandbox
            ? 'https://api.sandbox.africastalking.com'
            : 'https://api.africastalking.com';
    }
}
