<?php

namespace App\Http\Middleware;

use App\Settings\GeneralSettings;
use App\Support\Branding;
use App\Support\UploadLimits;
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
        $general = app(GeneralSettings::class);

        return [
            ...parent::share($request),
            'name' => Branding::name(),
            'icon' => Branding::iconUrl(),
            'currency' => $general->default_currency,
            'timezone' => $general->timezone,
            'auth' => [
                'user' => $user ? [
                    ...$user->toArray(),
                    'role' => $user->getRoleNames()->first(),
                    'avatar' => $user->getFirstMediaUrl('avatar') ?: null,
                ] : null,
                'permissions' => $user ? $user->getAllPermissions()->pluck('name')->all() : [],
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'unreadMessagesCount' => $user ? $user->unreadMessagesCount() : 0,
            'unreadNotificationsCount' => $user ? $user->unreadNotifications()->count() : 0,
            'limits' => [
                'photoMaxMb' => UploadLimits::photoMaxMb(),
                'documentMaxMb' => UploadLimits::documentMaxMb(),
                'postMaxMb' => UploadLimits::postMaxMb(),
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
