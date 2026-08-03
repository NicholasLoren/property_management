<?php

namespace App\Http\Controllers;

use App\Exports\RolesExport;
use App\Http\Requests\Roles\StoreRoleRequest;
use App\Http\Requests\Roles\UpdateRoleRequest;
use App\Models\Permission;
use App\Models\PermissionCategory;
use App\Models\Role;
use App\Settings\BrandingSettings;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

class RoleController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $this->parseFilters($request);
        $sort = $request->string('sort', 'name')->value() === 'users' ? 'users' : 'name';
        $dir = $request->string('dir', 'asc')->value() === 'desc' ? 'desc' : 'asc';
        $perPage = (int) $request->integer('per_page', 10);
        $perPage = in_array($perPage, [10, 25, 50], true) ? $perPage : 10;

        $query = $this->filteredQuery($filters);

        $sortColumn = $sort === 'users' ? 'users_count' : 'name';
        $query->orderBy($sortColumn, $dir)->orderBy('id');

        $paginator = $query->paginate($perPage)->withQueryString();

        return Inertia::render('roles/index', [
            'roles' => [
                'data' => $paginator->getCollection()
                    ->map(fn (Role $role) => $this->transform($role, $filters['tab'] === 'trash'))
                    ->all(),
                'meta' => [
                    'current_page' => $paginator->currentPage(),
                    'last_page' => $paginator->lastPage(),
                    'per_page' => $paginator->perPage(),
                    'total' => $paginator->total(),
                    'from' => $paginator->firstItem(),
                    'to' => $paginator->lastItem(),
                ],
            ],
            'filters' => [
                'search' => $filters['search'],
                'sort' => $sort,
                'dir' => $dir,
                'per_page' => $perPage,
                'tab' => $filters['tab'],
            ],
            'counts' => [
                'active' => Role::count(),
                'trash' => Role::onlyTrashed()->count(),
            ],
        ]);
    }

    public function export(Request $request, string $format, BrandingSettings $branding): HttpResponse
    {
        $query = $this->filteredQuery($this->parseFilters($request))->orderBy('name');
        $export = new RolesExport($query);

        return $format === 'excel'
            ? $export->download('roles.xlsx')
            : Pdf::loadView('exports.pdf-table', [
                'title' => 'Roles',
                'headings' => $export->headings(),
                'rows' => $query->get()->map($export->map(...)),
                'headerText' => $branding->pdf_header_text,
                'accentColor' => $branding->accent_color,
            ])->download('roles.pdf');
    }

    /**
     * @return array{tab: string, search: string}
     */
    private function parseFilters(Request $request): array
    {
        return [
            'tab' => $request->string('tab', 'active')->value() === 'trash' ? 'trash' : 'active',
            'search' => $request->string('search')->trim()->value(),
        ];
    }

    /**
     * @param  array{tab: string, search: string}  $filters
     * @return Builder<Role>
     */
    private function filteredQuery(array $filters): Builder
    {
        $query = $filters['tab'] === 'trash'
            ? Role::onlyTrashed()->with('deletedBy')
            : Role::query();

        $query->with('permissions')->withCount(['permissions', 'users']);

        if ($filters['search'] !== '') {
            $query->where('name', 'like', "%{$filters['search']}%");
        }

        return $query;
    }

    /**
     * @return array<int, array{id: int, name: string, label: string, permissions: array<int, array{id: int, name: string, label: string}>}>
     */
    private function permissionCategories(): array
    {
        return PermissionCategory::query()
            ->with(['permissions' => fn ($q) => $q->orderBy('label')])
            ->orderBy('label')
            ->get()
            ->map(fn (PermissionCategory $category): array => [
                'id' => $category->id,
                'name' => $category->name,
                'label' => $category->label,
                'permissions' => $category->permissions
                    ->map(fn (Permission $permission): array => [
                        'id' => $permission->id,
                        'name' => $permission->name,
                        'label' => $permission->label,
                    ])
                    ->all(),
            ])
            ->all();
    }

    public function create(): Response
    {
        return Inertia::render('roles/form', [
            'permissionCategories' => $this->permissionCategories(),
        ]);
    }

    public function store(StoreRoleRequest $request): RedirectResponse
    {
        $role = Role::create([
            'name' => $request->validated('name'),
            'description' => $request->validated('description'),
            'guard_name' => 'web',
        ]);

        $role->syncPermissions(array_map(intval(...), $request->validated('permissions', [])));

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$role->name} role was created."]);

        return to_route('roles.index');
    }

    public function edit(Role $role): Response
    {
        $role->load('permissions');

        return Inertia::render('roles/form', [
            'role' => $this->transform($role),
            'permissionCategories' => $this->permissionCategories(),
        ]);
    }

    public function update(UpdateRoleRequest $request, Role $role): RedirectResponse
    {
        $this->guardSystemRole($role, 'edited');

        $role->update([
            'name' => $request->validated('name'),
            'description' => $request->validated('description'),
        ]);
        $role->syncPermissions(array_map(intval(...), $request->validated('permissions', [])));

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$role->name} role was updated."]);

        return to_route('roles.index');
    }

    public function destroy(Request $request, Role $role): RedirectResponse
    {
        $this->guardSystemRole($role, 'deleted');

        if ($role->users()->count() > 0) {
            throw ValidationException::withMessages([
                'role' => "{$role->name} is still assigned to users. Reassign them before deleting this role.",
            ]);
        }

        $role->forceFill(['deleted_by' => $request->user()->id])->save();
        $role->delete();

        return back();
    }

    public function restore(Role $role): RedirectResponse
    {
        $role->restore();
        $role->forceFill(['deleted_by' => null])->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$role->name} role was restored."]);

        return back();
    }

    public function forceDelete(Role $role): RedirectResponse
    {
        $this->guardSystemRole($role, 'deleted');

        $name = $role->name;
        $role->forceDelete();

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$name} role was permanently deleted."]);

        return back();
    }

    private function guardSystemRole(Role $role, string $action): void
    {
        if ($role->is_system) {
            abort(403, "The {$role->name} role is protected and cannot be {$action}.");
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function transform(Role $role, bool $withTrashMeta = false): array
    {
        $data = [
            'id' => $role->id,
            'name' => $role->name,
            'description' => $role->description,
            'is_system' => $role->is_system,
            'permissions_count' => $role->permissions_count,
            'users_count' => $role->users_count,
            'permission_ids' => $role->permissions->pluck('id')->all(),
        ];

        if ($withTrashMeta) {
            $data['deleted_at'] = $role->deleted_at?->toIso8601String();
            $data['deleted_by_name'] = $role->deletedBy?->name;
        }

        return $data;
    }
}
