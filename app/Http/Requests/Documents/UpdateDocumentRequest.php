<?php

namespace App\Http\Requests\Documents;

use App\Enums\CategoryType;
use App\Support\UploadLimits;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateDocumentRequest extends FormRequest
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
            'title' => ['required', 'string', 'max:255'],
            'category_id' => [
                'required',
                Rule::exists('categories', 'id')->where('type', CategoryType::Document->value),
            ],
            'notes' => ['nullable', 'string', 'max:5000'],
            'file' => ['nullable', 'file', 'mimes:pdf,docx,ppt,txt,jpg,jpeg,png,webp,avi,gif,svg', 'max:'.UploadLimits::documentMaxKb()],
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
