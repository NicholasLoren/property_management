<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;

class UpdateBrandingSettingsRequest extends FormRequest
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
            'pdf_header_text' => ['required', 'string', 'max:255'],
            'accent_color' => ['required', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'logo' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,svg', 'max:2048'],
            'logo_remove' => ['nullable', 'boolean'],
        ];
    }
}
