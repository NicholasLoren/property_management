<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;

class UpdateBillingSettingsRequest extends FormRequest
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
            'days_in_month' => ['required', 'integer', 'between:28,31'],
            'rent_reminder_days_before' => ['required', 'integer', 'between:0,30'],
            'rent_overdue_reminder_days_after' => ['required', 'integer', 'between:0,30'],
            'rent_overdue_reminder_repeat_days' => ['required', 'integer', 'between:1,30'],
        ];
    }
}
