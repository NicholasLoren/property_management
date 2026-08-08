<?php

namespace App\Console\Commands;

use App\Models\Amenity;
use App\Models\Category;
use App\Models\Document;
use App\Models\Lease;
use App\Models\MaintenanceRequest;
use App\Models\Payment;
use App\Models\Property;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\Transaction;
use App\Models\Unit;
use App\Models\UnitType;
use App\Models\User;
use App\Settings\GeneralSettings;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\QueryException;

class PurgeTrashedRecords extends Command
{
    protected $signature = 'app:purge-trashed-records';

    protected $description = 'Permanently delete trashed records older than the configured retention period.';

    /**
     * Every soft-deletable model, children before parents. A row that's
     * still referenced by a not-yet-purged child (e.g. a Property whose
     * Units haven't aged out yet) throws on forceDelete() — caught below —
     * rather than skipping the reference check, so ordering here just
     * minimizes how often that happens; it never causes bad deletes.
     *
     * @var array<int, class-string<Model>>
     */
    private const array MODELS = [
        Document::class,
        MaintenanceRequest::class,
        Payment::class,
        Transaction::class,
        Lease::class,
        Tenant::class,
        Unit::class,
        UnitType::class,
        Amenity::class,
        Property::class,
        Category::class,
        User::class,
        Role::class,
    ];

    public function handle(GeneralSettings $settings): int
    {
        $cutoff = now()->subDays($settings->trash_retention_days);

        $purged = 0;
        $skipped = 0;

        foreach (self::MODELS as $model) {
            /** @var Collection<int, Model> $records */
            $records = $model::onlyTrashed()->where('deleted_at', '<', $cutoff)->get();

            foreach ($records as $record) {
                try {
                    $record->forceDelete();
                    $purged++;
                } catch (QueryException) {
                    // Still referenced by a live record (e.g. a Category
                    // used on a Transaction that isn't trashed) — leave it
                    // for a future run once that reference is gone.
                    $skipped++;
                }
            }
        }

        $this->info("Purged {$purged} record(s) older than {$settings->trash_retention_days} days".
            ($skipped > 0 ? ", skipped {$skipped} still referenced by other records." : '.'));

        if ($purged > 0 || $skipped > 0) {
            activity()->useLog('system')->log(
                "Purged {$purged} trashed record(s) older than {$settings->trash_retention_days} days".
                ($skipped > 0 ? " ({$skipped} skipped, still referenced)." : '.')
            );
        }

        return self::SUCCESS;
    }
}
