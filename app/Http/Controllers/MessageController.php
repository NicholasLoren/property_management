<?php

namespace App\Http\Controllers;

use App\Enums\MessageType;
use App\Http\Requests\Messages\StoreMessageRequest;
use App\Models\Message;
use App\Models\MessageRecipient;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MessageController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $tab = $request->string('tab', 'inbox')->value() === 'sent' ? 'sent' : 'inbox';
        $search = $request->string('search')->trim()->value();
        $perPage = (int) $request->integer('per_page', 10);
        $perPage = in_array($perPage, [10, 25, 50], true) ? $perPage : 10;

        $paginator = $tab === 'sent'
            ? $this->sentQuery($user, $search)->paginate($perPage)->withQueryString()
            : $this->inboxQuery($user, $search)->paginate($perPage)->withQueryString();

        $rows = $tab === 'sent'
            ? $paginator->getCollection()->map($this->transformSent(...))->all()
            : $paginator->getCollection()->map($this->transformInbox(...))->all();

        return Inertia::render('messages/index', [
            'messages' => [
                'data' => $rows,
                'meta' => [
                    'current_page' => $paginator->currentPage(),
                    'last_page' => $paginator->lastPage(),
                    'per_page' => $paginator->perPage(),
                    'total' => $paginator->total(),
                    'from' => $paginator->firstItem(),
                    'to' => $paginator->lastItem(),
                ],
            ],
            'filters' => [
                'search' => $search,
                'tab' => $tab,
                'per_page' => $perPage,
            ],
            'counts' => [
                'inbox' => $user->receivedMessages()->count(),
                'sent' => Message::query()->where('sender_id', $user->id)->count(),
            ],
        ]);
    }

    /**
     * @return Builder<Message>
     */
    private function sentQuery(User $user, string $search): Builder
    {
        $query = Message::query()->where('sender_id', $user->id)->withCount('recipients');

        if ($search !== '') {
            $query->where(fn ($q) => $q->where('subject', 'like', "%{$search}%")
                ->orWhere('body', 'like', "%{$search}%"));
        }

        return $query->orderByDesc('created_at');
    }

    /**
     * @return BelongsToMany<Message, User, MessageRecipient, 'pivot'>
     */
    private function inboxQuery(User $user, string $search): BelongsToMany
    {
        $query = $user->receivedMessages()->with('sender');

        if ($search !== '') {
            $query->where(fn ($q) => $q->where('subject', 'like', "%{$search}%")
                ->orWhere('body', 'like', "%{$search}%"));
        }

        return $query->orderByDesc('messages.created_at');
    }

    public function create(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('messages/form', [
            'users' => User::query()
                ->where('id', '!=', $user->id)
                ->orderBy('name')
                ->get(['id', 'name', 'email'])
                ->map(fn (User $u) => ['id' => $u->id, 'name' => $u->name, 'email' => $u->email])
                ->all(),
            'roles' => Role::query()->orderBy('name')->pluck('name')->all(),
            'canBroadcast' => (bool) $user->can('messages.broadcast'),
        ]);
    }

    public function store(StoreMessageRequest $request): RedirectResponse
    {
        $message = Message::create([
            'sender_id' => $request->user()->id,
            'type' => $request->validated('type'),
            'subject' => $request->validated('subject'),
            'body' => $request->validated('body'),
        ]);

        $message->recipients()->attach($this->resolveRecipients($request));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Message sent.']);

        return to_route('messages.index');
    }

    /**
     * @return array<int, int>
     */
    private function resolveRecipients(StoreMessageRequest $request): array
    {
        if ($request->validated('type') === MessageType::Personal->value) {
            return [(int) $request->validated('recipient_user_id')];
        }

        $query = User::query()->where('id', '!=', $request->user()->id);

        if ($request->validated('recipient_scope') === 'role') {
            $role = $request->validated('recipient_role');
            $query->whereHas('roles', fn ($q) => $q->where('name', $role));
        }

        return $query->pluck('id')->all();
    }

    public function show(Request $request, Message $message): Response
    {
        return Inertia::render('messages/show', [
            'message' => $this->loadMessageDetails($request, $message),
        ]);
    }

    public function details(Request $request, Message $message): JsonResponse
    {
        return response()->json([
            'message' => $this->loadMessageDetails($request, $message),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function loadMessageDetails(Request $request, Message $message): array
    {
        $user = $request->user();
        $isSender = $message->sender_id === $user->id;
        $recipientPivot = $message->recipients()->where('user_id', $user->id)->first()?->pivot;

        abort_unless($isSender || $recipientPivot, 403);

        if ($recipientPivot && $recipientPivot->read_at === null) {
            $message->recipients()->updateExistingPivot($user->id, ['read_at' => now()]);
        }

        $message->load('sender');

        if ($isSender) {
            $message->load('recipients');
        }

        return [
            'id' => $message->id,
            'type' => $message->type->value,
            'type_label' => $message->type->label(),
            'subject' => $message->subject,
            'body' => $message->body,
            'sender_name' => $message->sender !== null ? $message->sender->name : 'Deleted user',
            'created_at' => $message->created_at?->toIso8601String(),
            'is_sender' => $isSender,
            'recipients' => $isSender
                ? $message->recipients->map(fn (User $recipient) => [
                    'name' => $recipient->name,
                    'read_at' => $recipient->pivot->read_at,
                ])->all()
                : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformSent(Message $message): array
    {
        return [
            'id' => $message->id,
            'type' => $message->type->value,
            'type_label' => $message->type->label(),
            'subject' => $message->subject,
            'recipients_count' => $message->recipients_count,
            'created_at' => $message->created_at?->toIso8601String(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformInbox(Message $message): array
    {
        return [
            'id' => $message->id,
            'type' => $message->type->value,
            'type_label' => $message->type->label(),
            'subject' => $message->subject,
            'sender_name' => $message->sender !== null ? $message->sender->name : 'Deleted user',
            'read_at' => $message->pivot?->read_at,
            'created_at' => $message->created_at?->toIso8601String(),
        ];
    }
}
