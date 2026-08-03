<?php

namespace App\Http\Requests\Messages;

use App\Enums\MessageType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        $ability = $this->input('type') === MessageType::Broadcast->value
            ? 'messages.broadcast'
            : 'messages.send';

        return (bool) $this->user()?->can($ability);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'type' => ['required', Rule::enum(MessageType::class)],
            'subject' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string', 'max:5000'],
            'recipient_user_id' => ['required_if:type,personal', 'nullable', 'integer', 'exists:users,id'],
            'recipient_scope' => ['required_if:type,broadcast', 'nullable', 'in:all,role'],
            'recipient_role' => ['required_if:recipient_scope,role', 'nullable', 'string', 'exists:roles,name'],
        ];
    }
}
