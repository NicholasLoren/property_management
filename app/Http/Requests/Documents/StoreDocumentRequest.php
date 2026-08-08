<?php

namespace App\Http\Requests\Documents;

use App\Enums\CategoryType;
use App\Http\Controllers\DocumentController;
use App\Support\UploadLimits;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDocumentRequest extends FormRequest
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
            'documentable_type' => ['required', Rule::in(array_keys(DocumentController::DOCUMENTABLE_TYPES))],
            'documentable_id' => [
                'required',
                'integer',
                function (string $attribute, mixed $value, Closure $fail): void {
                    $modelClass = DocumentController::DOCUMENTABLE_TYPES[$this->input('documentable_type')] ?? null;

                    if ($modelClass === null || ! $modelClass::query()->whereKey($value)->exists()) {
                        $fail('The selected record could not be found.');
                    }
                },
            ],
            'title' => ['required', 'string', 'max:255'],
            'category_id' => [
                'required',
                Rule::exists('categories', 'id')->where('type', CategoryType::Document->value),
            ],
            'notes' => ['nullable', 'string', 'max:5000'],
            'file' => ['required', 'file', 'mimes:pdf,docx,ppt,txt,jpg,jpeg,png,webp,avi,gif,svg', 'max:'.UploadLimits::documentMaxKb()],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'file.mimes' => 'Only PDF, Word, PowerPoint, text, and image/video files up to '.UploadLimits::documentMaxMb().'mb are allowed.',
            'file.max' => 'Only PDF, Word, PowerPoint, text, and image/video files up to '.UploadLimits::documentMaxMb().'mb are allowed.',
        ];
    }
}
