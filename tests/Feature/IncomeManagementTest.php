<?php

namespace Tests\Feature;

use App\Enums\TransactionType;
use App\Models\Category;
use App\Models\Property;
use App\Models\Transaction;
use App\Models\User;
use Database\Seeders\PermissionCategorySeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class IncomeManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            PermissionCategorySeeder::class,
            PermissionSeeder::class,
            RoleSeeder::class,
        ]);
    }

    private function admin(): User
    {
        $user = User::factory()->create();
        $user->assignRole('Super Admin');

        return $user;
    }

    public function test_user_without_permission_cannot_view_income(): void
    {
        $manager = User::factory()->create();
        $manager->assignRole('Manager');

        $this->actingAs($manager)
            ->get(route('incomes.index'))
            ->assertForbidden();
    }

    public function test_admin_can_create_an_income_entry(): void
    {
        $admin = $this->admin();
        $property = Property::factory()->create();
        $category = Category::factory()->income()->create();

        $this->actingAs($admin)
            ->post(route('incomes.store'), [
                'property_id' => (string) $property->id,
                'category_id' => (string) $category->id,
                'amount' => 30000,
                'transaction_date' => now()->toDateString(),
            ])
            ->assertRedirect(route('incomes.index'));

        $this->assertDatabaseHas('transactions', [
            'property_id' => $property->id,
            'type' => TransactionType::Income->value,
            'category_id' => $category->id,
            'amount' => 30000,
        ]);

        $income = Transaction::query()->where('property_id', $property->id)->firstOrFail();
        $this->assertSame($admin->id, $income->created_by);
        $this->assertNotNull($income->code);
        $this->assertStringStartsWith('INC-', $income->code);
    }

    public function test_income_rejects_an_expense_category(): void
    {
        $admin = $this->admin();
        $property = Property::factory()->create();
        $expenseCategory = Category::factory()->expense()->create();

        $this->actingAs($admin)
            ->post(route('incomes.store'), [
                'property_id' => (string) $property->id,
                'category_id' => (string) $expenseCategory->id,
                'amount' => 30000,
                'transaction_date' => now()->toDateString(),
            ])
            ->assertSessionHasErrors('category_id');
    }

    public function test_incomes_index_only_lists_income_type_transactions(): void
    {
        $property = Property::factory()->create();
        Transaction::factory()->create(['property_id' => $property->id, 'type' => TransactionType::Expense]);
        Transaction::factory()->create(['property_id' => $property->id, 'type' => TransactionType::Income]);

        $this->actingAs($this->admin())
            ->get(route('incomes.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('incomes/index')
                ->has('incomes.data', 1)
            );
    }

    public function test_admin_can_trash_and_restore_an_income_entry(): void
    {
        $admin = $this->admin();
        $income = Transaction::factory()->create(['type' => TransactionType::Income]);

        $this->actingAs($admin)
            ->delete(route('incomes.destroy', ['income' => $income->id]))
            ->assertRedirect();

        $this->assertSoftDeleted('transactions', ['id' => $income->id]);

        $this->actingAs($admin)
            ->patch(route('incomes.restore', ['income' => $income->id]))
            ->assertRedirect();

        $this->assertDatabaseHas('transactions', ['id' => $income->id, 'deleted_at' => null]);
    }
}
