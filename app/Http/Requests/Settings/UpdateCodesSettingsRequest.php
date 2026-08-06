<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCodesSettingsRequest extends FormRequest
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
        $rules = [];

        foreach (['property', 'unit', 'document', 'expense', 'income'] as $type) {
            $rules["{$type}_prefix"] = ['required', 'string', 'max:20', 'alpha_dash'];
            $rules["{$type}_template"] = ['required', 'string', 'max:100'];
        }

        return $rules;
    }
}
