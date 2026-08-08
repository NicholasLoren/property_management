<?php

namespace App\Http\Requests\Maintenance;

use App\Enums\MaintenancePriority;
use App\Enums\MaintenanceStatus;
use App\Support\UploadLimits;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMaintenanceRequestRequest extends FormRequest
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
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'priority' => ['required', Rule::enum(MaintenancePriority::class)],
            'status' => ['required', Rule::enum(MaintenanceStatus::class)],
            'assigned_to' => ['nullable', Rule::exists('users', 'id')->whereNull('deleted_at')],
            'cost' => ['nullable', 'numeric', 'min:0'],
            'scheduled_date' => ['nullable', 'date'],
            'completed_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'photos' => ['nullable', 'array'],
            'photos.*' => ['file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:'.UploadLimits::photoMaxKb()],
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
