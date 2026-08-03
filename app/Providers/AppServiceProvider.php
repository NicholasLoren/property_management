<?php

namespace App\Providers;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use Jenssegers\Agent\Agent;
use Spatie\Activitylog\Models\Activity;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();

        // Super Admin is protected (Role::is_system) and bypasses every
        // permission check, rather than needing every permission attached.
        Gate::before(fn ($user, string $ability): ?bool => $user->hasRole('Super Admin') ? true : null);

        $this->configureActivityLog();
    }

    /**
     * Merge request/device context onto every activity log entry, whether
     * it was logged automatically (LogsActivity on a model) or manually
     * (the activity() helper) — a single place instead of repeating this
     * per call site.
     */
    protected function configureActivityLog(): void
    {
        Activity::creating(function (Activity $activity): void {
            $agent = new Agent;

            $activity->properties = $activity->properties->merge([
                'ip' => request()->ip(),
                'browser' => $agent->browser() ?: null,
                'platform' => $agent->platform() ?: null,
                'device' => $agent->device() ?: null,
            ]);
        });
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
