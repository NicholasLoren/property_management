<?php

namespace App\Http\Requests\Payments;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Lease;
use App\Models\PaymentSchedule;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePaymentRequest extends FormRequest
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
            'lease_id' => ['required', Rule::exists('leases', 'id')->whereNull('deleted_at')],
            'tenant_id' => [
                'nullable',
                Rule::exists('tenants', 'id')->whereNull('deleted_at'),
                function (string $attribute, mixed $value, Closure $fail): void {
                    $lease = Lease::query()->find($this->input('lease_id'));

                    if ($lease !== null && ! $lease->tenants()->whereKey($value)->exists()) {
                        $fail('The selected tenant is not on this lease.');
                    }
                },
            ],
            'payment_schedule_ids' => ['required', 'array', 'min:1'],
            'payment_schedule_ids.*' => [
                Rule::exists('payment_schedules', 'id'),
                function (string $attribute, mixed $value, Closure $fail): void {
                    $schedule = PaymentSchedule::query()->whereKey($value)->first();

                    if ($schedule !== null && (string) $schedule->lease_id !== (string) $this->input('lease_id')) {
                        $fail('The selected rent period is not on this lease.');
                    }
                },
            ],
            'amount' => ['required', 'numeric', 'min:0'],
            'payment_date' => ['required', 'date'],
            'method' => ['required', Rule::enum(PaymentMethod::class)],
            'status' => ['required', Rule::enum(PaymentStatus::class)],
            'reference' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'receipt' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:5120'],
        ];
    }
}
