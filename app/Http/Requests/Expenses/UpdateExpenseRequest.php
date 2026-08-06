<?php

namespace App\Http\Requests\Expenses;

use App\Enums\CategoryType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateExpenseRequest extends FormRequest
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
            'property_id' => ['required', Rule::exists('properties', 'id')->whereNull('deleted_at')],
            'category_id' => [
                'required',
                Rule::exists('categories', 'id')->where('type', CategoryType::Expense->value),
            ],
            'amount' => ['required', 'numeric', 'min:0'],
            'transaction_date' => ['required', 'date'],
            'description' => ['nullable', 'string', 'max:5000'],
            'receipt' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:5120'],
            'receipt_remove' => ['nullable', 'boolean'],
        ];
    }
}
