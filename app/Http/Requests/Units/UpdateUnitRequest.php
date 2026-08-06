<?php

namespace App\Http\Requests\Units;

use App\Enums\BillingPeriod;
use App\Enums\UnitStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUnitRequest extends FormRequest
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
            'unit_type_id' => ['nullable', Rule::exists('unit_types', 'id')],
            'name' => ['required', 'string', 'max:255'],
            'size' => ['nullable', 'string', 'max:255'],
            'status' => ['required', Rule::enum(UnitStatus::class)],
            'price_amount' => ['nullable', 'numeric', 'min:0'],
            'price_billing_period' => ['nullable', Rule::enum(BillingPeriod::class)],
            'features' => ['nullable', 'array'],
            'features.*.unit_feature_id' => [Rule::exists('unit_features', 'id')],
            'features.*.quantity' => ['required_with:features.*.unit_feature_id', 'integer', 'min:1'],
            'photos' => ['nullable', 'array'],
            'photos.*' => ['file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'remove_photo_ids' => ['nullable', 'array'],
            'remove_photo_ids.*' => ['integer'],
        ];
    }
}
