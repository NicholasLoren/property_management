<?php

namespace App\Http\Requests\Users;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class InviteUserRequest extends FormRequest
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
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'role' => ['required', 'string', Rule::exists('roles', 'name')->whereNull('deleted_at')],
            'landlord_id_number' => ['nullable', 'string', 'max:255'],
            'landlord_address' => ['nullable', 'string', 'max:255'],
            'landlord_notes' => ['nullable', 'string', 'max:2000'],
            'landlord_id_document' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:5120'],
        ];
    }
}
