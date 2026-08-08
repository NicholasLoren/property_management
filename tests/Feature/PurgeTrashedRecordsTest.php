<?php

namespace Tests\Feature;

use App\Enums\PropertyType;
use App\Models\Category;
use App\Models\Property;
use App\Models\Transaction;
use App\Models\Unit;
use App\Settings\GeneralSettings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PurgeTrashedRecordsTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_purges_trashed_records_older_than_the_configured_retention(): void
    {
        app(GeneralSettings::class)->fill(['trash_retention_days' => 30])->save();

        $old = Category::factory()->create();
        $old->delete();
        $old->forceFill(['deleted_at' => now()->subDays(31)])->save();

        $recent = Category::factory()->create();
        $recent->delete();
        $recent->forceFill(['deleted_at' => now()->subDays(10)])->save();

        $this->artisan('app:purge-trashed-records')->assertSuccessful();

        $this->assertDatabaseMissing('categories', ['id' => $old->id]);
        $this->assertDatabaseHas('categories', ['id' => $recent->id]);
    }

    public function test_it_skips_a_record_still_referenced_by_a_live_record(): void
    {
        app(GeneralSettings::class)->fill(['trash_retention_days' => 30])->save();

        $category = Category::factory()->expense()->create();
        Transaction::factory()->create(['category_id' => $category->id]);

        $category->delete();
        $category->forceFill(['deleted_at' => now()->subDays(60)])->save();

        $this->artisan('app:purge-trashed-records')->assertSuccessful();

        $this->assertDatabaseHas('categories', ['id' => $category->id]);
    }

    public function test_it_purges_a_trashed_property_and_its_units_together(): void
    {
        app(GeneralSettings::class)->fill(['trash_retention_days' => 30])->save();

        $property = Property::factory()->create(['type' => PropertyType::MultiUnit]);
        $unit = Unit::factory()->create(['property_id' => $property->id]);

        $unit->forceFill(['deleted_at' => now()->subDays(60)])->save();
        $property->forceFill(['deleted_at' => now()->subDays(60)])->save();

        $this->artisan('app:purge-trashed-records')->assertSuccessful();

        $this->assertDatabaseMissing('units', ['id' => $unit->id]);
        $this->assertDatabaseMissing('properties', ['id' => $property->id]);
    }

    public function test_it_respects_a_custom_retention_period(): void
    {
        app(GeneralSettings::class)->fill(['trash_retention_days' => 7])->save();

        $category = Category::factory()->create();
        $category->delete();
        $category->forceFill(['deleted_at' => now()->subDays(8)])->save();

        $this->artisan('app:purge-trashed-records')->assertSuccessful();

        $this->assertDatabaseMissing('categories', ['id' => $category->id]);
    }
}
