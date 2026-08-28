<?php

namespace App\Http\Requests\Leases;

use App\Enums\SignerRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreLeaseSignatureRequest extends FormRequest
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
            'signer_role' => ['required', Rule::enum(SignerRole::class)],
            'tenant_id' => [
                Rule::requiredIf($this->input('signer_role') === SignerRole::Tenant->value),
                'nullable',
                Rule::exists('tenants', 'id')->whereNull('deleted_at'),
            ],
            'signer_name' => ['required', 'string', 'max:255'],
            'signature_image' => ['required', 'string', 'starts_with:data:image/png;base64,'],
        ];
    }
}
