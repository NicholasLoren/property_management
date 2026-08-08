<?php

namespace App\Http\Requests\Properties;

use App\Enums\PropertyType;
use App\Models\User;
use App\Support\UploadLimits;
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
            'photos.*' => ['file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:'.UploadLimits::photoMaxKb()],
            'remove_photo_ids' => ['nullable', 'array'],
            'remove_photo_ids.*' => ['integer'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'photos.*.file' => 'One of the photos could not be uploaded. It may exceed the server\'s maximum upload size of '.UploadLimits::photoMaxMb().'MB, or the upload was interrupted.',
            'photos.*.max' => 'Each photo must be '.UploadLimits::photoMaxMb().'MB or smaller.',
        ];
    }
}
