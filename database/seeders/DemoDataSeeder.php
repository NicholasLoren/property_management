<?php

namespace Database\Seeders;

use App\Enums\LeaseStatus;
use App\Enums\MaintenancePriority;
use App\Enums\MaintenanceStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\PropertyType;
use App\Enums\TransactionType;
use App\Enums\UnitStatus;
use App\Models\Lease;
use App\Models\Payment;
use App\Models\PaymentSchedule;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Spatie\Permission\PermissionRegistrar;

/**
 * Bulk demo data across every model, on top of whatever's already in the
 * DB (never truncates) — for evaluating how the UI/reports behave at
 * realistic scale. Opt-in only: not part of DatabaseSeeder's default run,
 * since it's meant for a developer's own DB, not fresh installs or CI.
 *
 * Run with: php artisan db:seed --class=DemoDataSeeder
 *
 * Lease and Payment go through Eloquent `create()` because their model
 * events matter (PaymentScheduleGenerator, unit-occupancy sync, payment-
 * schedule status sync) — that's what makes the generated
 * PaymentSchedule/Payment data internally consistent. Everything else is a
 * chunked raw insert for speed; IDs are recovered via `lastInsertId()`,
 * which is safe here because each chunk is a single multi-row INSERT
 * (MySQL/InnoDB reserves a contiguous auto_increment block for those).
 */
class DemoDataSeeder extends Seeder
{
    private const int LANDLORD_COUNT = 150;

    private const int MANAGER_COUNT = 850;

    private const int PROPERTY_COUNT = 1000;

    private const int TENANT_COUNT = 1000;

    private const int LEASE_COUNT = 1000;

    private const int TRANSACTION_COUNT = 1000;

    private const int MAINTENANCE_COUNT = 1000;

    private const int DOCUMENT_COUNT = 1000;

    private const int MESSAGE_COUNT = 1000;

    private const int CHUNK = 500;

    public function run(): void
    {
        $start = microtime(true);

        [$landlordIds, $managerIds] = $this->seedUsers();
        $this->info('Users: '.count($landlordIds).' landlords, '.count($managerIds).' managers');

        $staffIds = array_merge($managerIds, [User::query()->role('Super Admin')->value('id')]);
        $staffIds = array_values(array_filter($staffIds));

        $this->seedLandlordDetails($landlordIds);
        $this->info('Landlord details seeded');

        $propertyIds = $this->seedProperties($landlordIds);
        $this->info('Properties: '.count($propertyIds));

        $unitIds = $this->seedUnits($propertyIds);
        $this->info('Units: '.count($unitIds));

        $this->seedUnitPrices($unitIds, $staffIds);
        $this->info('Unit prices seeded');

        $this->seedPropertyAmenities($propertyIds);
        $this->seedUnitFeatures($unitIds);
        $this->info('Amenity/feature attachments seeded');

        $tenantIds = $this->seedTenants();
        $this->info('Tenants: '.count($tenantIds));

        $maintenanceIds = $this->seedMaintenanceRequests($unitIds, $staffIds);
        $this->info('Maintenance requests: '.count($maintenanceIds));

        $leaseCount = $this->seedLeasesAndPayments($unitIds, $tenantIds, $staffIds);
        $this->info("Leases: {$leaseCount['leases']}, payment schedules: {$leaseCount['schedules']}, payments: {$leaseCount['payments']}");

        $this->seedTransactions($propertyIds, $maintenanceIds, $staffIds);
        $this->info('Transactions: '.self::TRANSACTION_COUNT);

        $this->seedDocuments($propertyIds, $unitIds, $leaseCount['lease_ids'], $tenantIds, $staffIds);
        $this->info('Documents: '.self::DOCUMENT_COUNT);

        $allUserIds = array_values(array_unique(array_merge($landlordIds, $managerIds, $staffIds)));
        $this->seedMessages($allUserIds);
        $this->info('Messages: '.self::MESSAGE_COUNT);

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $elapsed = round(microtime(true) - $start, 1);
        $this->info("Done in {$elapsed}s");
    }

    private function info(string $message): void
    {
        $this->command->info($message);
    }

    /**
     * Bulk-inserts $rows in chunks of self::CHUNK and returns every
     * inserted primary key, recovered via `lastInsertId()` per chunk.
     *
     * @param  array<int, array<string, mixed>>  $rows
     * @return array<int, int>
     */
    private function bulkInsert(string $table, array $rows): array
    {
        $ids = [];

        foreach (array_chunk($rows, self::CHUNK) as $chunk) {
            DB::table($table)->insert($chunk);
            $firstId = (int) DB::getPdo()->lastInsertId();

            foreach (range($firstId, $firstId + count($chunk) - 1) as $id) {
                $ids[] = $id;
            }
        }

        return $ids;
    }

    /**
     * @template T
     *
     * @param  array<int, T>  $items
     * @return T
     */
    private function pick(array $items): mixed
    {
        return $items[array_rand($items)];
    }

    /**
     * @param  array<string, float>  $weights  option => relative weight
     */
    private function weighted(array $weights): string
    {
        $total = array_sum($weights);
        $roll = mt_rand() / mt_getrandmax() * $total;
        $cumulative = 0.0;

        foreach ($weights as $option => $weight) {
            $cumulative += $weight;

            if ($roll <= $cumulative) {
                return $option;
            }
        }

        return array_key_first($weights);
    }

    /**
     * @return array{0: array<int, int>, 1: array<int, int>} [landlordIds, managerIds]
     */
    private function seedUsers(): array
    {
        $password = Hash::make('password');
        $now = now();

        $landlordRows = [];
        for ($i = 0; $i < self::LANDLORD_COUNT; $i++) {
            $landlordRows[] = [
                'name' => fake()->name(),
                'email' => 'demo.landlord.'.Str::random(10).'@example.test',
                'email_verified_at' => $now,
                'password' => $password,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }
        $landlordIds = $this->bulkInsert('users', $landlordRows);

        $managerRows = [];
        for ($i = 0; $i < self::MANAGER_COUNT; $i++) {
            $managerRows[] = [
                'name' => fake()->name(),
                'email' => 'demo.manager.'.Str::random(10).'@example.test',
                'email_verified_at' => $now,
                'password' => $password,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }
        $managerIds = $this->bulkInsert('users', $managerRows);

        $landlordRoleId = Role::query()->where('name', 'Landlord')->value('id');
        $managerRoleId = Role::query()->where('name', 'Manager')->value('id');

        $roleRows = [];
        foreach ($landlordIds as $id) {
            $roleRows[] = ['role_id' => $landlordRoleId, 'model_type' => User::class, 'model_id' => $id];
        }
        foreach ($managerIds as $id) {
            $roleRows[] = ['role_id' => $managerRoleId, 'model_type' => User::class, 'model_id' => $id];
        }
        foreach (array_chunk($roleRows, self::CHUNK) as $chunk) {
            DB::table('model_has_roles')->insert($chunk);
        }

        return [$landlordIds, $managerIds];
    }

    /**
     * @param  array<int, int>  $landlordIds
     */
    private function seedLandlordDetails(array $landlordIds): void
    {
        $now = now();
        $rows = array_map(fn (int $userId): array => [
            'user_id' => $userId,
            'id_number' => 'ID'.fake()->unique()->numerify('########'),
            'address' => fake()->address(),
            'phone' => fake()->phoneNumber(),
            'notes' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ], $landlordIds);

        $this->bulkInsert('landlord_details', $rows);
    }

    /**
     * @param  array<int, int>  $landlordIds
     * @return array<int, int>
     */
    private function seedProperties(array $landlordIds): array
    {
        $now = now();
        $rows = [];

        for ($i = 0; $i < self::PROPERTY_COUNT; $i++) {
            $type = $this->weighted([PropertyType::Standalone->value => 55, PropertyType::MultiUnit->value => 45]);

            $rows[] = [
                'code' => 'PROP-D'.str_pad((string) ($i + 1), 5, '0', STR_PAD_LEFT),
                'landlord_id' => $this->pick($landlordIds),
                'name' => fake()->streetName().' '.($type === PropertyType::Standalone->value ? 'House' : 'Apartments'),
                'type' => $type,
                'address' => fake()->address(),
                'description' => fake()->optional()->sentence(),
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        return $this->bulkInsert('properties', $rows);
    }

    /**
     * @param  array<int, int>  $propertyIds
     * @return array<int, int>
     */
    private function seedUnits(array $propertyIds): array
    {
        $now = now();
        $unitTypeIds = DB::table('unit_types')->pluck('id')->all();
        $propertyTypeById = DB::table('properties')->whereIn('id', $propertyIds)->pluck('type', 'id');
        $rows = [];
        $seq = 0;

        foreach ($propertyIds as $propertyId) {
            $isStandalone = $propertyTypeById[$propertyId] === PropertyType::Standalone->value;
            $unitCount = $isStandalone ? 1 : random_int(2, 6);

            for ($u = 0; $u < $unitCount; $u++) {
                $seq++;
                $status = $this->weighted([UnitStatus::Vacant->value => 35, UnitStatus::Occupied->value => 65]);

                $rows[] = [
                    'code' => 'UNIT-D'.str_pad((string) $seq, 6, '0', STR_PAD_LEFT),
                    'property_id' => $propertyId,
                    'unit_type_id' => $this->pick($unitTypeIds),
                    'name' => 'Unit '.strtoupper(Str::random(1)).random_int(1, 99),
                    'size' => random_int(18, 140).' sqm',
                    'status' => $status,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        return $this->bulkInsert('units', $rows);
    }

    /**
     * @param  array<int, int>  $unitIds
     * @param  array<int, int>  $staffIds
     */
    private function seedUnitPrices(array $unitIds, array $staffIds): void
    {
        $now = now();
        $rows = array_map(fn (int $unitId): array => [
            'unit_id' => $unitId,
            'amount' => random_int(15, 300) * 10000,
            'billing_period' => 'monthly',
            'effective_from' => now()->subMonths(random_int(1, 10))->toDateString(),
            'effective_to' => null,
            'created_by' => $this->pick($staffIds),
            'created_at' => $now,
            'updated_at' => $now,
        ], $unitIds);

        $this->bulkInsert('unit_prices', $rows);
    }

    /**
     * @param  array<int, int>  $propertyIds
     */
    private function seedPropertyAmenities(array $propertyIds): void
    {
        $amenityIds = DB::table('amenities')->pluck('id')->all();
        $rows = [];

        foreach ($propertyIds as $propertyId) {
            $chosen = (array) array_rand(array_flip($amenityIds), min(random_int(1, 4), count($amenityIds)));
            foreach ($chosen as $amenityId) {
                $rows[] = ['property_id' => $propertyId, 'amenity_id' => $amenityId];
            }
        }

        foreach (array_chunk($rows, self::CHUNK) as $chunk) {
            DB::table('property_amenity')->insert($chunk);
        }
    }

    /**
     * @param  array<int, int>  $unitIds
     */
    private function seedUnitFeatures(array $unitIds): void
    {
        $featureIds = DB::table('unit_features')->pluck('id')->all();
        $rows = [];

        foreach ($unitIds as $unitId) {
            $chosen = (array) array_rand(array_flip($featureIds), min(random_int(1, 3), count($featureIds)));
            foreach ($chosen as $featureId) {
                $rows[] = ['unit_id' => $unitId, 'unit_feature_id' => $featureId, 'quantity' => random_int(1, 3)];
            }
        }

        foreach (array_chunk($rows, self::CHUNK) as $chunk) {
            DB::table('unit_feature_unit')->insert($chunk);
        }
    }

    /**
     * @return array<int, int>
     */
    private function seedTenants(): array
    {
        $now = now();
        $rows = [];

        for ($i = 0; $i < self::TENANT_COUNT; $i++) {
            $rows[] = [
                'name' => fake()->name(),
                'email' => fake()->boolean(70) ? fake()->unique()->safeEmail() : null,
                'phone' => fake()->phoneNumber(),
                'id_number' => 'ID'.fake()->unique()->numerify('########'),
                'address' => fake()->optional()->address(),
                'notes' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        return $this->bulkInsert('tenants', $rows);
    }

    /**
     * @param  array<int, int>  $unitIds
     * @param  array<int, int>  $staffIds
     * @return array<int, int>
     */
    private function seedMaintenanceRequests(array $unitIds, array $staffIds): array
    {
        $now = now();
        $rows = [];

        for ($i = 0; $i < self::MAINTENANCE_COUNT; $i++) {
            $status = $this->weighted([
                MaintenanceStatus::Open->value => 30,
                MaintenanceStatus::InProgress->value => 20,
                MaintenanceStatus::Completed->value => 40,
                MaintenanceStatus::Cancelled->value => 10,
            ]);
            $isCompleted = $status === MaintenanceStatus::Completed->value;

            $rows[] = [
                'unit_id' => $this->pick($unitIds),
                'title' => fake()->sentence(4),
                'description' => fake()->optional()->paragraph(),
                'priority' => $this->weighted([
                    MaintenancePriority::Low->value => 25,
                    MaintenancePriority::Medium->value => 40,
                    MaintenancePriority::High->value => 25,
                    MaintenancePriority::Urgent->value => 10,
                ]),
                'status' => $status,
                'assigned_to' => fake()->boolean(70) ? $this->pick($staffIds) : null,
                'cost' => $isCompleted ? random_int(20, 800) * 1000 : null,
                'scheduled_date' => fake()->boolean(50) ? now()->addDays(random_int(-30, 30))->toDateString() : null,
                'completed_at' => $isCompleted ? now()->subDays(random_int(0, 90)) : null,
                'notes' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        return $this->bulkInsert('maintenance_requests', $rows);
    }

    /**
     * @param  array<int, int>  $unitIds
     * @param  array<int, int>  $tenantIds
     * @param  array<int, int>  $staffIds
     * @return array{leases: int, schedules: int, payments: int, lease_ids: array<int, int>}
     */
    private function seedLeasesAndPayments(array $unitIds, array $tenantIds, array $staffIds): array
    {
        $leaseIds = [];
        $leaseTenants = [];

        DB::transaction(function () use ($unitIds, $tenantIds, &$leaseIds, &$leaseTenants): void {
            for ($i = 0; $i < self::LEASE_COUNT; $i++) {
                $status = $this->weighted([
                    LeaseStatus::Active->value => 60,
                    LeaseStatus::Draft->value => 12,
                    LeaseStatus::Ended->value => 18,
                    LeaseStatus::Terminated->value => 10,
                ]);

                [$startDate, $endDate] = $this->leaseDates($status);

                $lease = Lease::create([
                    'unit_id' => $this->pick($unitIds),
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'rent_amount' => random_int(15, 300) * 10000,
                    'billing_period' => 'monthly',
                    'billing_day' => Carbon::parse($startDate)->day,
                    'security_deposit' => fake()->boolean(70) ? random_int(15, 300) * 10000 : null,
                    'status' => $status,
                ]);

                $tenantsForLease = (array) array_rand(array_flip($tenantIds), random_int(1, 2));
                $lease->tenants()->attach($tenantsForLease);

                $leaseIds[] = $lease->id;
                $leaseTenants[$lease->id] = array_values($tenantsForLease);
            }
        });

        $schedules = PaymentSchedule::query()
            ->whereIn('lease_id', $leaseIds)
            ->orderBy('period_start')
            ->get(['id', 'lease_id', 'amount_expected', 'period_start']);

        $paymentCount = 0;

        DB::transaction(function () use ($schedules, $leaseTenants, $staffIds, &$paymentCount): void {
            foreach ($schedules as $schedule) {
                // Leave roughly a quarter unpaid — that's what makes Rent
                // Arrears / Advance Payments reports show anything.
                if (! fake()->boolean(75)) {
                    continue;
                }

                $tenantsForLease = $leaseTenants[$schedule->lease_id] ?? [];
                $isFullPayment = random_int(1, 100) <= 75;
                $amount = $isFullPayment
                    ? $schedule->amount_expected
                    : round((float) $schedule->amount_expected * (random_int(30, 90) / 100), 2);

                Payment::create([
                    'lease_id' => $schedule->lease_id,
                    'payment_schedule_id' => $schedule->id,
                    'tenant_id' => $tenantsForLease === [] ? null : $this->pick($tenantsForLease),
                    'amount' => $amount,
                    'payment_date' => Carbon::parse($schedule->period_start)->addDays(random_int(0, 10)),
                    'method' => $this->weighted([
                        PaymentMethod::MobileMoney->value => 50,
                        PaymentMethod::BankTransfer->value => 25,
                        PaymentMethod::Cash->value => 20,
                        PaymentMethod::Cheque->value => 5,
                    ]),
                    'status' => PaymentStatus::Completed->value,
                    'created_by' => $this->pick($staffIds),
                ]);

                $paymentCount++;
            }
        });

        return [
            'leases' => count($leaseIds),
            'schedules' => $schedules->count(),
            'payments' => $paymentCount,
            'lease_ids' => $leaseIds,
        ];
    }

    /**
     * @return array{0: string, 1: string}
     */
    private function leaseDates(string $status): array
    {
        return match ($status) {
            LeaseStatus::Active->value => [
                now()->subMonths(random_int(1, 9))->toDateString(),
                now()->addMonths(random_int(1, 12))->toDateString(),
            ],
            LeaseStatus::Draft->value => [
                now()->addDays(random_int(1, 30))->toDateString(),
                now()->addMonths(12)->toDateString(),
            ],
            LeaseStatus::Ended->value => [
                now()->subMonths(random_int(14, 20))->toDateString(),
                now()->subMonths(random_int(1, 6))->toDateString(),
            ],
            default => [ // Terminated
                now()->subMonths(random_int(10, 16))->toDateString(),
                now()->subMonths(random_int(1, 8))->toDateString(),
            ],
        };
    }

    /**
     * @param  array<int, int>  $propertyIds
     * @param  array<int, int>  $maintenanceIds
     * @param  array<int, int>  $staffIds
     */
    private function seedTransactions(array $propertyIds, array $maintenanceIds, array $staffIds): void
    {
        $now = now();
        $expenseCategoryIds = DB::table('categories')->where('type', 'expense')->pluck('id')->all();
        $incomeCategoryIds = DB::table('categories')->where('type', 'income')->pluck('id')->all();
        $rows = [];

        for ($i = 0; $i < self::TRANSACTION_COUNT; $i++) {
            $isExpense = fake()->boolean(60);
            $linkToMaintenance = $isExpense && fake()->boolean(20);

            $rows[] = [
                'code' => ($isExpense ? 'EXP-D' : 'INC-D').str_pad((string) ($i + 1), 5, '0', STR_PAD_LEFT),
                'property_id' => $this->pick($propertyIds),
                'type' => $isExpense ? TransactionType::Expense->value : TransactionType::Income->value,
                'category_id' => $this->pick($isExpense ? $expenseCategoryIds : $incomeCategoryIds),
                'amount' => random_int(10, 900) * 1000,
                'transaction_date' => now()->subDays(random_int(0, 300))->toDateString(),
                'description' => fake()->optional()->sentence(),
                'maintenance_request_id' => $linkToMaintenance ? $this->pick($maintenanceIds) : null,
                'created_by' => $this->pick($staffIds),
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        $this->bulkInsert('transactions', $rows);
    }

    /**
     * @param  array<int, int>  $propertyIds
     * @param  array<int, int>  $unitIds
     * @param  array<int, int>  $leaseIds
     * @param  array<int, int>  $tenantIds
     * @param  array<int, int>  $staffIds
     */
    private function seedDocuments(array $propertyIds, array $unitIds, array $leaseIds, array $tenantIds, array $staffIds): void
    {
        $now = now();
        $categoryIds = DB::table('categories')->where('type', 'document')->pluck('id')->all();

        $pools = [
            'property' => $propertyIds,
            'unit' => $unitIds,
            'lease' => $leaseIds,
            'tenant' => $tenantIds,
        ];

        $rows = [];
        for ($i = 0; $i < self::DOCUMENT_COUNT; $i++) {
            $alias = $this->pick(array_keys($pools));

            $rows[] = [
                'code' => 'DOC-D'.str_pad((string) ($i + 1), 5, '0', STR_PAD_LEFT),
                'documentable_type' => $alias,
                'documentable_id' => $this->pick($pools[$alias]),
                'title' => fake()->sentence(3),
                'category_id' => $this->pick($categoryIds),
                'notes' => fake()->optional()->sentence(),
                'uploaded_by' => $this->pick($staffIds),
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        $this->bulkInsert('documents', $rows);
    }

    /**
     * @param  array<int, int>  $userIds
     */
    private function seedMessages(array $userIds): void
    {
        $userIds = array_values(array_unique($userIds));
        $now = now();
        $messageRows = [];

        for ($i = 0; $i < self::MESSAGE_COUNT; $i++) {
            $messageRows[] = [
                'sender_id' => $this->pick($userIds),
                'type' => fake()->boolean(30) ? 'broadcast' : 'personal',
                'subject' => fake()->sentence(5),
                'body' => fake()->paragraph(),
                'created_at' => $now->copy()->subDays(random_int(0, 200)),
                'updated_at' => $now,
            ];
        }

        $messageIds = $this->bulkInsert('messages', $messageRows);

        $recipientRows = [];
        foreach ($messageIds as $index => $messageId) {
            $isBroadcast = $messageRows[$index]['type'] === 'broadcast';
            $recipientCount = $isBroadcast ? random_int(5, 15) : random_int(1, 3);
            $recipients = (array) array_rand(array_flip($userIds), min($recipientCount, count($userIds)));

            foreach (array_unique($recipients) as $recipientId) {
                $recipientRows[] = [
                    'message_id' => $messageId,
                    'user_id' => $recipientId,
                    'read_at' => fake()->boolean(50) ? $now->copy()->subDays(random_int(0, 199)) : null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        foreach (array_chunk($recipientRows, self::CHUNK) as $chunk) {
            DB::table('message_recipients')->insertOrIgnore($chunk);
        }
    }
}
