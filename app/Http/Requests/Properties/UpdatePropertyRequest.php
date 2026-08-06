<?php

namespace App\Http\Requests\Properties;

use App\Enums\PropertyType;
use App\Models\User;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePropertyRequest extends FormRequest
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
            'landlord_id' => [
                'required',
                Rule::exists('users', 'id')->whereNull('deleted_at'),
                function (string $attribute, mixed $value, Closure $fail): void {
                    $user = User::query()->whereKey($value)->first();

                    if ($user !== null && ! $user->hasRole('Landlord')) {
                        $fail('The selected user is not a landlord.');
                    }
                },
            ],
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::enum(PropertyType::class)],
            'address' => ['required', 'string', 'max:255'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'description' => ['nullable', 'string', 'max:5000'],
            'amenity_ids' => ['nullable', 'array'],
            'amenity_ids.*' => [Rule::exists('amenities', 'id')],
            'photos' => ['nullable', 'array'],
            'photos.*' => ['file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'remove_photo_ids' => ['nullable', 'array'],
            'remove_photo_ids.*' => ['integer'],
        ];
    }
}
