<?php

namespace App\Models;

use App\Enums\MaintenancePriority;
use App\Enums\MaintenanceStatus;
use Database\Factories\MaintenanceRequestFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

/**
 * A repair/maintenance ticket for a Unit. Completing one with a cost set
 * creates (or updates) a linked expense Transaction — see
 * MaintenanceController::syncExpense() — so the financial ledger and the
 * maintenance log never drift apart.
 *
 * @property int $id
 * @property int $unit_id
 * @property string $title
 * @property string|null $description
 * @property MaintenancePriority $priority
 * @property MaintenanceStatus $status
 * @property int|null $assigned_to
 * @property string|null $cost
 * @property Carbon|null $scheduled_date
 * @property Carbon|null $completed_at
 * @property string|null $notes
 * @property Carbon|null $deleted_at
 * @property int|null $deleted_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['unit_id', 'title', 'description', 'priority', 'status', 'assigned_to', 'cost', 'scheduled_date', 'completed_at', 'notes'])]
class MaintenanceRequest extends Model implements HasMedia
{
    /** @use HasFactory<MaintenanceRequestFactory> */
    use HasFactory, InteractsWithMedia, LogsActivity, SoftDeletes;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'priority' => MaintenancePriority::class,
            'status' => MaintenanceStatus::class,
            'cost' => 'decimal:2',
            'scheduled_date' => 'date',
            'completed_at' => 'datetime',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['title', 'priority', 'status', 'cost'])
            ->logOnlyDirty()
            ->dontLogEmptyChanges()
            ->useLogName('maintenance_request')
            ->setDescriptionForEvent(fn (string $eventName): string => "Maintenance request \"{$this->title}\" was {$eventName}");
    }

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('photos')
            ->acceptsMimeTypes(['image/jpeg', 'image/png', 'image/webp']);
    }

    /**
     * @return BelongsTo<Unit, $this>
     */
    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /**
     * The user who moved this request to trash.
     *
     * @return BelongsTo<User, $this>
     */
    public function deletedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'deleted_by');
    }

    /**
     * @return HasOne<Transaction, $this>
     */
    public function expense(): HasOne
    {
        return $this->hasOne(Transaction::class);
    }
}
