<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;

class UpdateGeneralSettingsRequest extends FormRequest
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
        return [
            'company_name' => ['required', 'string', 'max:255'],
            'support_email' => ['required', 'string', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:500'],
            'phone' => ['nullable', 'string', 'max:32'],
            'default_currency' => ['required', 'string', 'size:3'],
            'timezone' => ['required', 'string', 'timezone'],
            'trash_retention_days' => ['required', 'integer', 'min:1', 'max:365'],
        ];
    }
}
