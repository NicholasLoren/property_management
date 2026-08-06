<?php

use App\Enums\CategoryType;
use Database\Seeders\CategorySeeder;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Old value => canonical Category name, for mapping the enum-backed
     * string columns being replaced here onto real Category rows.
     */
    private const array EXPENSE_MAP = [
        'maintenance' => 'Maintenance',
        'utilities' => 'Utilities',
        'tax' => 'Tax',
        'insurance' => 'Insurance',
        'management_fee' => 'Management fee',
        'other' => 'Other',
    ];

    private const array INCOME_MAP = [
        'late_fee' => 'Late fee',
        'parking' => 'Parking',
        'laundry' => 'Laundry',
        'deposit_forfeiture' => 'Deposit forfeiture',
        'other' => 'Other',
    ];

    private const array DOCUMENT_MAP = [
        'contract' => 'Contract',
        'insurance' => 'Insurance',
        'compliance' => 'Compliance',
        'financial' => 'Financial',
        'other' => 'Other',
    ];

    public function up(): void
    {
        // Backfill needs the canonical rows to exist first — safe to call
        // directly (firstOrCreate-based, idempotent) even if CategorySeeder
        // also runs later via db:seed.
        (new CategorySeeder)->run();

        Schema::table('transactions', function (Blueprint $table) {
            $table->foreignId('category_id')->nullable()->after('type')->constrained()->restrictOnDelete();
        });

        Schema::table('documents', function (Blueprint $table) {
            $table->foreignId('category_id')->nullable()->after('category')->constrained()->restrictOnDelete();
        });

        $this->backfill('transactions', 'type', [
            CategoryType::Expense->value => self::EXPENSE_MAP,
            CategoryType::Income->value => self::INCOME_MAP,
        ]);

        $this->backfill('documents', null, [
            CategoryType::Document->value => self::DOCUMENT_MAP,
        ]);

        Schema::table('transactions', function (Blueprint $table) {
            $table->dropColumn('category');
            $table->foreignId('category_id')->nullable(false)->change();
        });

        Schema::table('documents', function (Blueprint $table) {
            $table->dropColumn('category');
            $table->foreignId('category_id')->nullable(false)->change();
        });
    }

    /**
     * @param  array<string, array<string, string>>  $mapsByDiscriminator  discriminator value (or the single Document map keyed by CategoryType::Document->value) => [old string value => Category name]
     */
    private function backfill(string $table, ?string $discriminatorColumn, array $mapsByDiscriminator): void
    {
        foreach ($mapsByDiscriminator as $categoryType => $map) {
            $categories = DB::table('categories')->where('type', $categoryType)->pluck('id', 'name');

            $query = DB::table($table);

            if ($discriminatorColumn !== null) {
                $query->where($discriminatorColumn, $categoryType);
            }

            foreach ($query->get(['id', 'category']) as $row) {
                $name = $map[$row->category] ?? $map['other'] ?? null;
                $categoryId = $name !== null ? ($categories[$name] ?? null) : null;

                if ($categoryId !== null) {
                    DB::table($table)->where('id', $row->id)->update(['category_id' => $categoryId]);
                }
            }
        }
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->string('category')->nullable()->after('type');
            $table->dropConstrainedForeignId('category_id');
        });

        Schema::table('documents', function (Blueprint $table) {
            $table->string('category')->nullable()->after('title');
            $table->dropConstrainedForeignId('category_id');
        });
    }
};
