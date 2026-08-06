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

class ExpenseManagementTest extends TestCase
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

    public function test_user_without_permission_cannot_view_expenses(): void
    {
        $manager = User::factory()->create();
        $manager->assignRole('Manager');

        $this->actingAs($manager)
            ->get(route('expenses.index'))
            ->assertForbidden();
    }

    public function test_admin_can_create_an_expense(): void
    {
        $admin = $this->admin();
        $property = Property::factory()->create();
        $category = Category::factory()->expense()->create();

        $this->actingAs($admin)
            ->post(route('expenses.store'), [
                'property_id' => (string) $property->id,
                'category_id' => (string) $category->id,
                'amount' => 80000,
                'transaction_date' => now()->toDateString(),
            ])
            ->assertRedirect(route('expenses.index'));

        $this->assertDatabaseHas('transactions', [
            'property_id' => $property->id,
            'type' => TransactionType::Expense->value,
            'category_id' => $category->id,
            'amount' => 80000,
        ]);

        $expense = Transaction::query()->where('property_id', $property->id)->firstOrFail();
        $this->assertSame($admin->id, $expense->created_by);
        $this->assertNotNull($expense->code);
        $this->assertStringStartsWith('EXP-', $expense->code);
    }

    public function test_expense_rejects_an_income_category(): void
    {
        $admin = $this->admin();
        $property = Property::factory()->create();
        $incomeCategory = Category::factory()->income()->create();

        $this->actingAs($admin)
            ->post(route('expenses.store'), [
                'property_id' => (string) $property->id,
                'category_id' => (string) $incomeCategory->id,
                'amount' => 80000,
                'transaction_date' => now()->toDateString(),
            ])
            ->assertSessionHasErrors('category_id');
    }

    public function test_expenses_index_only_lists_expense_type_transactions(): void
    {
        $property = Property::factory()->create();
        Transaction::factory()->create(['property_id' => $property->id, 'type' => TransactionType::Expense]);
        Transaction::factory()->create(['property_id' => $property->id, 'type' => TransactionType::Income]);

        $this->actingAs($this->admin())
            ->get(route('expenses.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('expenses/index')
                ->has('expenses.data', 1)
            );
    }

    public function test_income_transaction_cannot_be_edited_via_expense_routes(): void
    {
        $income = Transaction::factory()->create(['type' => TransactionType::Income]);

        $this->actingAs($this->admin())
            ->get(route('expenses.edit', ['expense' => $income->id]))
            ->assertNotFound();
    }

    public function test_admin_can_trash_and_restore_an_expense(): void
    {
        $admin = $this->admin();
        $expense = Transaction::factory()->create(['type' => TransactionType::Expense]);

        $this->actingAs($admin)
            ->delete(route('expenses.destroy', ['expense' => $expense->id]))
            ->assertRedirect();

        $this->assertSoftDeleted('transactions', ['id' => $expense->id]);

        $this->actingAs($admin)
            ->patch(route('expenses.restore', ['expense' => $expense->id]))
            ->assertRedirect();

        $this->assertDatabaseHas('transactions', ['id' => $expense->id, 'deleted_at' => null]);
    }
}
