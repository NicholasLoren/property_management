<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;
use Spatie\Permission\Models\Role as SpatieRole;

/**
 * `is_system` roles (seeded "Super Admin") are protected from edit/delete —
 * see Gate::before in AppServiceProvider for the full-access bypass this enables.
 *
 * @property int $id
 * @property string $name
 * @property string|null $description
 * @property string $guard_name
 * @property bool $is_system
 * @property Carbon|null $deleted_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read int|null $permissions_count
 * @property-read int|null $users_count
 */
class Role extends SpatieRole
{
    use LogsActivity, SoftDeletes;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_system' => 'boolean',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'description'])
            ->logOnlyDirty()
            ->dontLogEmptyChanges()
            ->useLogName('role')
            ->setDescriptionForEvent(fn (string $eventName): string => "Role \"{$this->name}\" was {$eventName}");
    }

    /**
     * The user who moved this role to trash.
     *
     * @return BelongsTo<User, $this>
     */
    public function deletedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'deleted_by');
    }
}
