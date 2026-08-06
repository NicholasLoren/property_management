<?php

namespace App\Http\Requests\Leases;

use App\Enums\BillingPeriod;
use App\Enums\LeaseStatus;
use App\Models\Lease;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreLeaseRequest extends FormRequest
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
            'unit_id' => ['required', Rule::exists('units', 'id')->whereNull('deleted_at')],
            'tenant_ids' => ['required', 'array', 'min:1'],
            'tenant_ids.*' => [Rule::exists('tenants', 'id')->whereNull('deleted_at')],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after:start_date'],
            'rent_amount' => ['required', 'numeric', 'min:0'],
            'billing_period' => ['required', Rule::enum(BillingPeriod::class)],
            'security_deposit' => ['nullable', 'numeric', 'min:0'],
            'status' => [
                'required',
                Rule::enum(LeaseStatus::class),
                function (string $attribute, mixed $value, Closure $fail): void {
                    if ($value !== LeaseStatus::Active->value) {
                        return;
                    }

                    $unitId = $this->input('unit_id');
                    $alreadyActive = Lease::query()
                        ->where('unit_id', $unitId)
                        ->where('status', LeaseStatus::Active->value)
                        ->exists();

                    if ($alreadyActive) {
                        $fail('This unit already has an active lease.');
                    }
                },
            ],
            'notes' => ['nullable', 'string', 'max:5000'],
            'document' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:5120'],
        ];
    }
}
