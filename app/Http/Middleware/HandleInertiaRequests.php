<?php

namespace App\Http\Middleware;

use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $this->touchLastActive($request);

        $user = $request->user();

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user ? [...$user->toArray(), 'role' => $user->getRoleNames()->first()] : null,
                'can' => $user ? $this->abilities($user) : null,
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'unreadMessagesCount' => $user ? $user->unreadMessagesCount() : 0,
        ];
    }

    /**
     * The abilities the frontend branches on, grouped to match the
     * permission catalog (see database/seeders/PermissionSeeder.php).
     *
     * @return array<string, array<string, bool>>
     */
    private function abilities(User $user): array
    {
        return [
            'users' => [
                'view' => $user->can('users.view'),
                'add' => $user->can('users.add'),
                'edit' => $user->can('users.edit'),
                'delete' => $user->can('users.delete'),
            ],
            'roles' => [
                'view' => $user->can('roles.view'),
                'add' => $user->can('roles.add'),
                'edit' => $user->can('roles.edit'),
                'delete' => $user->can('roles.delete'),
            ],
            'settings' => [
                'edit' => $user->can('settings.edit'),
            ],
            'logs' => [
                'view' => $user->can('logs.view'),
            ],
            'messages' => [
                'view' => $user->can('messages.view'),
                'send' => $user->can('messages.send'),
                'broadcast' => $user->can('messages.broadcast'),
            ],
        ];
    }

    /**
     * Keep the authenticated user's last-active timestamp fresh, throttled
     * to at most once a minute so this doesn't write on every request.
     */
    private function touchLastActive(Request $request): void
    {
        $user = $request->user();

        if (! $user) {
            return;
        }

        if ($user->last_active_at !== null && $user->last_active_at->diffInMinutes(now()) < 1) {
            return;
        }

        $user->forceFill(['last_active_at' => now()])->saveQuietly();
    }
}
