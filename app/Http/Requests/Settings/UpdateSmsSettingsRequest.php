<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSmsSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        // The sandbox environment always sends as "sandbox" regardless of
        // what's stored (see AfricasTalkingSmsService::send()), so a real
        // username is only required for live sending.
        $requiresUsername = $this->boolean('enabled') && ! $this->boolean('sandbox');

        return [
            'enabled' => ['required', 'boolean'],
            'africastalking_username' => [$requiresUsername ? 'required' : 'nullable', 'string', 'max:255'],
            // Left blank on an edit means "keep the existing key" — the current
            // value is never sent back to the client (see SettingsController::edit()).
            'africastalking_api_key' => ['nullable', 'string', 'max:255'],
            'sender_id' => ['nullable', 'string', 'max:11'],
            'sandbox' => ['required', 'boolean'],
        ];
    }
}
