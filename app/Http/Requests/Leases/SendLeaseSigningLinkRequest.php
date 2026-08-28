<?php

namespace App\Http\Requests\Leases;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SendLeaseSigningLinkRequest extends FormRequest
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
            'tenant_id' => ['required', Rule::exists('tenants', 'id')->whereNull('deleted_at')],
        ];
    }
}
