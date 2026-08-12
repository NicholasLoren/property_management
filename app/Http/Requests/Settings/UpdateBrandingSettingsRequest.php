<?php

namespace App\Http\Requests\Settings;

use App\Support\UploadLimits;
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
            'primary_color' => ['required', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'accent_color' => ['required', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'logo' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,svg', 'max:'.UploadLimits::photoMaxKb()],
            'logo_remove' => ['nullable', 'boolean'],
            'app_icon' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:'.UploadLimits::photoMaxKb(), 'dimensions:min_width=512,min_height=512'],
            'app_icon_remove' => ['nullable', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        $sizeMessage = 'Only JPG, PNG, or WEBP images up to '.UploadLimits::photoMaxMb().'mb are allowed.';

        return [
            'logo.mimes' => 'Only JPG, PNG, WEBP, or SVG images up to '.UploadLimits::photoMaxMb().'mb are allowed.',
            'logo.max' => 'Only JPG, PNG, WEBP, or SVG images up to '.UploadLimits::photoMaxMb().'mb are allowed.',
            'app_icon.mimes' => $sizeMessage,
            'app_icon.max' => $sizeMessage,
            'app_icon.dimensions' => 'The app icon must be at least 512×512 pixels.',
        ];
    }
}
