<?php

namespace App\Console\Commands;

use App\Models\Role;
use App\Models\User;
use App\Settings\GeneralSettings;
use Illuminate\Console\Command;

class PurgeTrashedRecords extends Command
{
    protected $signature = 'app:purge-trashed-records';

    protected $description = 'Permanently delete trashed users and roles older than the configured retention period.';

    public function handle(GeneralSettings $settings): int
    {
        $cutoff = now()->subDays($settings->trash_retention_days);

        $users = User::onlyTrashed()->where('deleted_at', '<', $cutoff)->get();
        $users->each->forceDelete();

        $roles = Role::onlyTrashed()->where('deleted_at', '<', $cutoff)->get();
        $roles->each->forceDelete();

        $this->info("Purged {$users->count()} user(s) and {$roles->count()} role(s) older than {$settings->trash_retention_days} days.");

        return self::SUCCESS;
    }
}
