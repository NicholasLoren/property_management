<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    /**
     * The most recent notifications for the topbar dropdown — a plain
     * JSON endpoint (rather than an Inertia page) so opening the dropdown
     * doesn't navigate away from wherever the user currently is.
     */
    public function recent(Request $request): JsonResponse
    {
        $notifications = $request->user()->notifications()
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        return response()->json([
            'notifications' => $notifications->map(fn (DatabaseNotification $notification) => $this->transform($notification))->all(),
        ]);
    }

    public function index(Request $request): Response
    {
        $sortColumns = ['created_at', 'read_at', 'type'];
        $sort = $request->string('sort', 'created_at')->value();
        $sort = in_array($sort, $sortColumns, true) ? $sort : 'created_at';
        $dir = $request->string('dir', 'desc')->value() === 'asc' ? 'asc' : 'desc';
        $perPage = (int) $request->integer('per_page', 10);
        $perPage = in_array($perPage, [10, 25, 50], true) ? $perPage : 10;
        $search = $request->string('search')->trim()->value();

        $query = $request->user()->notifications();

        if ($search !== '') {
            $query->where('type', 'like', "%{$search}%");
        }

        $query->orderBy($sort, $dir)->orderBy('id');

        $paginator = $query->paginate($perPage)->withQueryString();

        return Inertia::render('notifications/index', [
            'notifications' => [
                'data' => $paginator->getCollection()
                    ->map(fn (DatabaseNotification $notification) => $this->transform($notification))
                    ->all(),
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
                'sort' => $sort,
                'dir' => $dir,
                'per_page' => $perPage,
            ],
        ]);
    }

    public function markAsRead(Request $request, string $notification): RedirectResponse
    {
        $request->user()->notifications()->findOrFail($notification)->markAsRead();

        return back();
    }

    public function markAllAsRead(Request $request): RedirectResponse
    {
        $request->user()->unreadNotifications->markAsRead();

        return back();
    }

    /**
     * @return array<string, mixed>
     */
    private function transform(DatabaseNotification $notification): array
    {
        return [
            'id' => $notification->id,
            'type' => $this->humanizeType($notification->type),
            'data' => $notification->data,
            'url' => $this->resourceUrl($notification),
            'read_at' => $notification->read_at?->toIso8601String(),
            'created_at' => $notification->created_at?->toIso8601String(),
        ];
    }

    private function humanizeType(string $type): string
    {
        return match ($type) {
            'App\Notifications\RentDueSoon' => 'Rent due soon',
            'App\Notifications\RentOverdue' => 'Rent overdue',
            default => str(class_basename($type))
                ->snake(' ')
                ->ucfirst()
                ->toString(),
        };
    }

    /**
     * Where clicking this notification should take you — every
     * notification is *about* some other record, so this is what makes it
     * actionable rather than just an inbox item. New notification types
     * only need a case added here (and, if they don't already carry one, a
     * *_id field in their toArray() payload) to get the same behavior.
     */
    private function resourceUrl(DatabaseNotification $notification): ?string
    {
        $data = $notification->data;
        $leaseId = $data['lease_id'] ?? null;

        return match ($data['type'] ?? null) {
            'rent_due_soon', 'rent_overdue' => $leaseId !== null ? route('leases.show', $leaseId) : null,
            default => null,
        };
    }
}
