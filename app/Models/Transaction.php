<?php

namespace App\Models;

use App\Enums\TransactionType;
use Database\Factories\TransactionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

/**
 * One row of the property-level financial ledger — either money in
 * (`income`) or money out (`expense`) — backing both the Expenses and
 * Income pages (ExpenseController / IncomeController both operate on this
 * one table, scoped by `type`) and the Reports totals. `category_id` points
 * at a Category row of the matching type (see Category, and the Extras
 * settings pages) — validated by the relevant FormRequest, not the model.
 *
 * @property int $id
 * @property string|null $code
 * @property int $property_id
 * @property TransactionType $type
 * @property int $category_id
 * @property string $amount
 * @property Carbon $transaction_date
 * @property string|null $description
 * @property int|null $maintenance_request_id
 * @property int|null $created_by
 * @property Carbon|null $deleted_at
 * @property int|null $deleted_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['code', 'property_id', 'type', 'category_id', 'amount', 'transaction_date', 'description', 'maintenance_request_id', 'created_by'])]
class Transaction extends Model implements HasMedia
{
    /** @use HasFactory<TransactionFactory> */
    use HasFactory, InteractsWithMedia, LogsActivity, SoftDeletes;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => TransactionType::class,
            'amount' => 'decimal:2',
            'transaction_date' => 'date',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['type', 'category_id', 'amount', 'transaction_date'])
            ->logOnlyDirty()
            ->dontLogEmptyChanges()
            ->useLogName('transaction')
            ->setDescriptionForEvent(fn (string $eventName): string => "{$this->type->label()} of {$this->amount} was {$eventName}");
    }

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('receipt')
            ->singleFile()
            ->acceptsMimeTypes(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
    }

    /**
     * @return BelongsTo<Property, $this>
     */
    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    /**
     * @return BelongsTo<Category, $this>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * @return BelongsTo<MaintenanceRequest, $this>
     */
    public function maintenanceRequest(): BelongsTo
    {
        return $this->belongsTo(MaintenanceRequest::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * The user who moved this transaction to trash.
     *
     * @return BelongsTo<User, $this>
     */
    public function deletedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'deleted_by');
    }
}
