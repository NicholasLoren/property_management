<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Document;
use App\Models\Property;
use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\PermissionCategorySeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DocumentManagementTest extends TestCase
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

    public function test_user_without_permission_cannot_view_documents(): void
    {
        $manager = User::factory()->create();
        $manager->assignRole('Manager');

        $this->actingAs($manager)
            ->get(route('documents.index'))
            ->assertForbidden();
    }

    public function test_admin_can_attach_a_document_to_a_property(): void
    {
        $admin = $this->admin();
        $property = Property::factory()->create();
        $category = Category::factory()->document()->create();

        $this->actingAs($admin)
            ->post(route('documents.store'), [
                'documentable_type' => 'property',
                'documentable_id' => (string) $property->id,
                'title' => 'Fire insurance certificate',
                'category_id' => (string) $category->id,
                // createWithContent, not create(): fake()->create() writes
                // an empty file, which Document's media collection rejects
                // (its acceptsMimeTypes sniffs real content, not the
                // client-reported mime, and an empty file sniffs as
                // application/x-empty).
                'file' => UploadedFile::fake()->createWithContent('insurance.pdf', '%PDF-1.4'.str_repeat('0', 500)),
            ])
            ->assertRedirect(route('documents.index'));

        $document = Document::query()->where('title', 'Fire insurance certificate')->firstOrFail();
        $this->assertTrue($document->documentable->is($property));
        $this->assertNotNull($document->getFirstMedia('file'));
        $this->assertSame($admin->id, $document->uploaded_by);
        $this->assertNotNull($document->code);
        $this->assertStringStartsWith('DOC-', $document->code);
    }

    public function test_admin_can_attach_a_document_to_a_tenant(): void
    {
        $admin = $this->admin();
        $tenant = Tenant::factory()->create();
        $category = Category::factory()->document()->create();

        $this->actingAs($admin)
            ->post(route('documents.store'), [
                'documentable_type' => 'tenant',
                'documentable_id' => (string) $tenant->id,
                'title' => 'Signed application form',
                'category_id' => (string) $category->id,
                'file' => UploadedFile::fake()->createWithContent('application.pdf', '%PDF-1.4'.str_repeat('0', 500)),
            ])
            ->assertRedirect(route('documents.index'));

        $document = Document::query()->where('title', 'Signed application form')->firstOrFail();
        $this->assertTrue($document->documentable->is($tenant));
    }

    public function test_document_requires_a_file_on_create(): void
    {
        $property = Property::factory()->create();
        $category = Category::factory()->document()->create();

        $this->actingAs($this->admin())
            ->post(route('documents.store'), [
                'documentable_type' => 'property',
                'documentable_id' => (string) $property->id,
                'title' => 'Missing file',
                'category_id' => (string) $category->id,
            ])
            ->assertSessionHasErrors('file');
    }

    public function test_admin_can_view_documents_index(): void
    {
        $property = Property::factory()->create();
        Document::factory()->count(2)->create([
            'documentable_type' => 'property',
            'documentable_id' => $property->id,
        ]);

        $this->actingAs($this->admin())
            ->get(route('documents.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('documents/index')
                ->has('documents.data', 2)
            );
    }

    public function test_admin_can_trash_and_restore_a_document(): void
    {
        $admin = $this->admin();
        $property = Property::factory()->create();
        $document = Document::factory()->create([
            'documentable_type' => 'property',
            'documentable_id' => $property->id,
        ]);

        $this->actingAs($admin)
            ->delete(route('documents.destroy', $document))
            ->assertRedirect();

        $this->assertSoftDeleted('documents', ['id' => $document->id]);

        $this->actingAs($admin)
            ->patch(route('documents.restore', $document))
            ->assertRedirect();

        $this->assertDatabaseHas('documents', ['id' => $document->id, 'deleted_at' => null]);
    }
}
