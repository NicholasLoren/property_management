<?php

namespace App\Http\Requests\Users;

use App\Enums\UserStatus;
use App\Rules\Phone;
use App\Support\UploadLimits;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

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
            // Left blank, the user's password is unchanged.
            'password' => ['nullable', 'string', Password::default(), 'confirmed'],
            'landlord_id_number' => ['nullable', 'string', 'max:255'],
            'landlord_address' => ['nullable', 'string', 'max:255'],
            'landlord_phone' => ['nullable', 'string', 'max:32', new Phone],
            'landlord_notes' => ['nullable', 'string', 'max:2000'],
            'landlord_id_document' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:5120'],
            'landlord_id_document_remove' => ['nullable', 'boolean'],
            'avatar' => ['nullable', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:'.UploadLimits::photoMaxKb()],
            'avatar_remove' => ['nullable', 'boolean'],
        ];
    }
}
