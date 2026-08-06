<?php

namespace Database\Seeders;

use App\Enums\CategoryType;
use App\Models\Category;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    /**
     * Seed a starter list of Expense, Income, and Document categories. More
     * can be added later from the Extras settings pages without a code
     * change — this replaced the old ExpenseCategory/IncomeCategory/
     * DocumentCategory enums for exactly that reason.
     *
     * Runs without the SoftDeletes global scope: this is also called
     * directly from the 2026_08_07_090001 migration, which seeds these rows
     * before the 2026_08_07_090002 migration adds `deleted_at` to
     * `categories` — querying that column here would fail on a fresh
     * migrate.
     */
    public function run(): void
    {
        $catalog = [
            CategoryType::Expense->value => ['Maintenance', 'Utilities', 'Tax', 'Insurance', 'Management fee', 'Other'],
            CategoryType::Income->value => ['Late fee', 'Parking', 'Laundry', 'Deposit forfeiture', 'Other'],
            CategoryType::Document->value => ['Contract', 'Insurance', 'Compliance', 'Financial', 'Other'],
        ];

        foreach ($catalog as $type => $names) {
            foreach ($names as $name) {
                Category::query()->withoutGlobalScope(SoftDeletingScope::class)
                    ->firstOrCreate(['type' => $type, 'name' => $name]);
            }
        }
    }
}
