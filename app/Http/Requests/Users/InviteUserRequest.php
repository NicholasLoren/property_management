<?php

namespace App\Http\Requests\Users;

use App\Support\UploadLimits;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

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
            // Left blank, the user is emailed a link to set their own
            // password (see UserController::store); set here, they're
            // told directly and no email goes out.
            'password' => ['nullable', 'string', Password::default(), 'confirmed'],
            'landlord_id_number' => ['nullable', 'string', 'max:255'],
            'landlord_address' => ['nullable', 'string', 'max:255'],
            'landlord_phone' => ['nullable', 'string', 'max:32'],
            'landlord_notes' => ['nullable', 'string', 'max:2000'],
            'landlord_id_document' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:5120'],
            'avatar' => ['nullable', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:'.UploadLimits::photoMaxKb()],
        ];
    }
}
