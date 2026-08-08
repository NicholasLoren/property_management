<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    public function index(Request $request): Response
    {
        $perPage = (int) $request->integer('per_page', 15);

        $paginator = $request->user()->notifications()
            ->orderByDesc('created_at')
            ->paginate($perPage)
            ->withQueryString();

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
}
