<?php

namespace App\Http\Requests\Tenants;

use App\Support\UploadLimits;
use Illuminate\Foundation\Http\FormRequest;

class UpdateTenantRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'id_number' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'id_document' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:5120'],
            'id_document_remove' => ['nullable', 'boolean'],
            'avatar' => ['nullable', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:'.UploadLimits::photoMaxKb()],
            'avatar_remove' => ['nullable', 'boolean'],
        ];
    }
}
