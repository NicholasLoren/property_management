<?php

namespace App\Http\Requests\Leases;

use App\Enums\BillingPeriod;
use App\Enums\LeaseStatus;
use App\Models\Lease;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateLeaseRequest extends FormRequest
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
        /** @var Lease $lease */
        $lease = $this->route('lease');

        return [
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
                function (string $attribute, mixed $value, Closure $fail) use ($lease): void {
                    if ($value !== LeaseStatus::Active->value) {
                        return;
                    }

                    $alreadyActive = Lease::query()
                        ->where('unit_id', $lease->unit_id)
                        ->where('status', LeaseStatus::Active->value)
                        ->whereKeyNot($lease->id)
                        ->exists();

                    if ($alreadyActive) {
                        $fail('This unit already has an active lease.');
                    }
                },
            ],
            'notes' => ['nullable', 'string', 'max:5000'],
            'document' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:5120'],
            'document_remove' => ['nullable', 'boolean'],
        ];
    }
}
