<?php

namespace App\Http\Requests\Tenants;

use App\Enums\IdentityDocumentType;
use App\Enums\PartyType;
use App\Rules\Phone;
use App\Support\UploadLimits;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
            'type' => ['nullable', Rule::enum(PartyType::class)],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:32', new Phone],
            'id_number' => ['nullable', 'string', 'max:255'],
            'tin' => ['nullable', 'string', 'max:255'],
            'id_document_type' => ['nullable', Rule::enum(IdentityDocumentType::class)],
            'address' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'contact_person_name' => ['nullable', 'string', 'max:255'],
            'contact_person_phone' => ['nullable', 'string', 'max:32', new Phone],
            'contact_person_email' => ['nullable', 'email', 'max:255'],
            'id_document' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:5120'],
            'id_document_remove' => ['nullable', 'boolean'],
            'avatar' => ['nullable', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:'.UploadLimits::photoMaxKb()],
            'avatar_remove' => ['nullable', 'boolean'],
        ];
    }
}
