<?php

namespace App\Http\Requests\Users;

use App\Enums\UserStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
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
            'email' => [
                'required', 'string', 'email', 'max:255',
                Rule::unique('users', 'email')->ignore($this->route('user')),
            ],
            'role' => ['required', 'string', Rule::exists('roles', 'name')->whereNull('deleted_at')],
            'status' => ['required', Rule::enum(UserStatus::class)],
            'landlord_id_number' => ['nullable', 'string', 'max:255'],
            'landlord_address' => ['nullable', 'string', 'max:255'],
            'landlord_notes' => ['nullable', 'string', 'max:2000'],
            'landlord_id_document' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:5120'],
            'landlord_id_document_remove' => ['nullable', 'boolean'],
        ];
    }
}
