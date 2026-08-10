<?php

namespace App\Http\Controllers;

use App\Enums\UserStatus;
use App\Exports\UsersExport;
use App\Http\Requests\Users\InviteUserRequest;
use App\Http\Requests\Users\UpdateUserRequest;
use App\Models\LandlordDetail;
use App\Models\Role;
use App\Models\User;
use App\Notifications\UserInvited;
use App\Settings\BrandingSettings;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

class UserController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $this->parseFilters($request);
        $sort = $request->string('sort', 'name')->value();
        $dir = $request->string('dir', 'asc')->value() === 'desc' ? 'desc' : 'asc';
        $perPage = (int) $request->integer('per_page', 10);
        $perPage = in_array($perPage, [10, 25, 50], true) ? $perPage : 10;

        $query = $this->filteredQuery($filters);

        if ($sort === 'role') {
            $query->leftJoin('model_has_roles', fn ($join) => $join
                ->on('model_has_roles.model_id', '=', 'users.id')
                ->where('model_has_roles.model_type', User::class))
                ->leftJoin('roles', 'roles.id', '=', 'model_has_roles.role_id')
                ->select('users.*')
                ->orderBy('roles.name', $dir);
        } else {
            $sortColumn = match ($sort) {
                'status' => 'status',
                'last_active' => 'last_active_at',
                default => 'name',
            };
            $query->orderBy($sortColumn, $dir);
        }

        $query->orderBy('users.id');

        $paginator = $query->paginate($perPage)->withQueryString();

        return Inertia::render('users/index', [
            'users' => [
                'data' => $paginator->getCollection()
                    ->map(fn (User $user) => $this->transform($user, $filters['tab'] === 'trash'))
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
                'role' => $filters['roles'],
                'status' => $filters['statuses'],
                'sort' => $sort,
                'dir' => $dir,
                'per_page' => $perPage,
                'tab' => $filters['tab'],
            ],
            'counts' => [
                'active' => User::count(),
                'trash' => User::onlyTrashed()->count(),
            ],
            'roles' => $this->roleOptions(),
            'statuses' => $this->statusOptions(),
        ]);
    }

    public function export(Request $request, string $format, BrandingSettings $branding): HttpResponse
    {
        $query = $this->filteredQuery($this->parseFilters($request))->orderBy('name');
        $export = new UsersExport($query);

        return $format === 'excel'
            ? $export->download('users.xlsx')
            : Pdf::loadView('exports.pdf-table', [
                'title' => 'Users',
                'headings' => $export->headings(),
                'rows' => $query->get()->map($export->map(...)),
                'headerText' => $branding->pdf_header_text,
                'accentColor' => $branding->accent_color,
            ])->download('users.pdf');
    }

    /**
     * @return array{tab: string, search: string, roles: array<int, string>, statuses: array<int, string>}
     */
    private function parseFilters(Request $request): array
    {
        $tab = $request->string('tab', 'active')->value() === 'trash' ? 'trash' : 'active';
        $availableRoleNames = Role::query()->pluck('name')->all();

        return [
            'tab' => $tab,
            'search' => $request->string('search')->trim()->value(),
            'roles' => array_values(array_intersect((array) $request->input('role', []), $availableRoleNames)),
            'statuses' => array_values(array_intersect(
                (array) $request->input('status', []),
                array_column(UserStatus::cases(), 'value'),
            )),
        ];
    }

    /**
     * @param  array{tab: string, search: string, roles: array<int, string>, statuses: array<int, string>}  $filters
     * @return Builder<User>
     */
    private function filteredQuery(array $filters): Builder
    {
        $query = $filters['tab'] === 'trash' ? User::onlyTrashed()->with('deletedBy') : User::query();

        $query->with(['roles' => fn ($q) => $q->withCount('permissions'), 'media']);

        if ($filters['search'] !== '') {
            $query->where(fn ($q) => $q->where('name', 'like', "%{$filters['search']}%")
                ->orWhere('email', 'like', "%{$filters['search']}%"));
        }

        if ($filters['tab'] !== 'trash') {
            if ($filters['roles'] !== []) {
                $query->whereHas('roles', fn ($q) => $q->whereIn('name', $filters['roles']));
            }

            if ($filters['statuses'] !== []) {
                $query->whereIn('status', $filters['statuses']);
            }
        }

        return $query;
    }

    public function create(Request $request): Response
    {
        $roles = $this->roleOptions();
        $requestedRole = $request->string('role')->value();
        $defaultRole = collect($roles)->contains('value', $requestedRole) ? $requestedRole : null;

        return Inertia::render('users/form', [
            'roles' => $roles,
            'statuses' => $this->statusOptions(),
            'defaultRole' => $defaultRole,
            'passwordRules' => PasswordRule::defaults()->toPasswordRulesString(),
        ]);
    }

    public function store(InviteUserRequest $request): RedirectResponse
    {
        $password = $request->validated('password');

        $user = User::create([
            'name' => $request->validated('name'),
            'email' => $request->validated('email'),
            'status' => UserStatus::Invited,
            // A password set here is relied on directly — Password::default()
            // already vetted its strength — otherwise a random, unusable one
            // holds the account until the emailed reset link is used.
            'password' => $password ?? Str::random(32),
        ]);

        $user->assignRole($request->validated('role'));
        $this->syncLandlordDetail($request, $user);
        $this->syncAvatar($request, $user);

        if ($password === null) {
            $user->notify(new UserInvited(Password::createToken($user)));
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$user->name} was invited."]);

        return to_route('users.index');
    }

    public function edit(User $user): Response
    {
        $user->load(['roles', 'landlordDetail.media', 'media']);

        return Inertia::render('users/form', [
            'user' => $this->transformForForm($user),
            'roles' => $this->roleOptions(),
            'statuses' => $this->statusOptions(),
            'passwordRules' => PasswordRule::defaults()->toPasswordRulesString(),
        ]);
    }

    public function update(UpdateUserRequest $request, User $user): RedirectResponse
    {
        $user->update($request->safe()->only(['name', 'email', 'status']));
        $user->syncRoles([$request->validated('role')]);
        $this->syncLandlordDetail($request, $user);
        $this->syncAvatar($request, $user);

        $password = $request->validated('password');

        if ($password !== null) {
            $user->forceFill(['password' => $password])->save();
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$user->name} was updated."]);

        return to_route('users.index');
    }

    public function show(User $user): Response
    {
        $user->load(['roles.permissions', 'landlordDetail.media', 'media']);

        return Inertia::render('users/show', [
            'user' => $this->transformForShow($user),
        ]);
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        $user->forceFill(['deleted_by' => $request->user()->id])->save();
        $user->delete();

        // No flash toast here: the frontend shows an inline "Undo" toast
        // instead of a plain confirmation.
        return back();
    }

    public function restore(User $user): RedirectResponse
    {
        $user->restore();
        $user->forceFill(['deleted_by' => null])->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$user->name} was restored."]);

        return back();
    }

    public function forceDelete(User $user): RedirectResponse
    {
        $name = $user->name;
        $user->forceDelete();

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$name} was permanently deleted."]);

        return back();
    }

    /**
     * @return array<string, mixed>
     */
    private function transform(User $user, bool $withTrashMeta = false): array
    {
        $role = $user->roles->first();

        $data = [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $role !== null ? $role->name : 'No role',
            'avatar' => $user->getFirstMediaUrl('avatar') ?: null,
            'permissions_count' => $role !== null ? $role->permissions_count : 0,
            'status' => $user->status->value,
            'status_label' => $user->status->label(),
            'last_active_at' => $user->last_active_at?->toIso8601String(),
        ];

        if ($withTrashMeta) {
            $data['deleted_at'] = $user->deleted_at?->toIso8601String();
            $data['deleted_by_name'] = $user->deletedBy?->name;
        }

        return $data;
    }

    /**
     * @return array<string, mixed>
     */
    private function transformForForm(User $user): array
    {
        $role = $user->roles->first();
        $detail = $user->landlordDetail;
        $document = $detail?->getFirstMedia('id_document');
        $avatar = $user->getFirstMedia('avatar');

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $role?->name,
            'status' => $user->status->value,
            'avatar' => $avatar ? ['name' => $avatar->file_name, 'url' => $avatar->getUrl()] : null,
            'landlord_id_number' => $detail?->id_number,
            'landlord_address' => $detail?->address,
            'landlord_phone' => $detail?->phone,
            'landlord_notes' => $detail?->notes,
            'landlord_id_document' => $document ? [
                'name' => $document->file_name,
                'url' => $document->getUrl(),
            ] : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformForShow(User $user): array
    {
        $role = $user->roles->first();
        $detail = $user->landlordDetail;
        $document = $detail?->getFirstMedia('id_document');

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $role?->name,
            'avatar' => $user->getFirstMediaUrl('avatar') ?: null,
            'permissions' => $role?->permissions->pluck('label')->all() ?? [],
            'status' => $user->status->value,
            'status_label' => $user->status->label(),
            'last_active_at' => $user->last_active_at?->toIso8601String(),
            'created_at' => $user->created_at?->toIso8601String(),
            'landlord' => $detail !== null ? [
                'id_number' => $detail->id_number,
                'address' => $detail->address,
                'phone' => $detail->phone,
                'notes' => $detail->notes,
                'document' => $document ? [
                    'name' => $document->file_name,
                    'url' => $document->getUrl(),
                ] : null,
            ] : null,
        ];
    }

    private function syncLandlordDetail(Request $request, User $user): void
    {
        $fields = [
            'id_number' => $request->input('landlord_id_number'),
            'address' => $request->input('landlord_address'),
            'phone' => $request->input('landlord_phone'),
            'notes' => $request->input('landlord_notes'),
        ];
        $hasFields = collect($fields)->filter(fn (?string $value) => filled($value))->isNotEmpty();
        $hasFile = $request->hasFile('landlord_id_document');
        $shouldRemove = $request->boolean('landlord_id_document_remove');

        if (! $hasFields && ! $hasFile && ! $shouldRemove) {
            return;
        }

        /** @var LandlordDetail $detail */
        $detail = $user->landlordDetail()->firstOrNew();
        $detail->fill($fields);
        $detail->save();

        if ($hasFile) {
            $detail->addMediaFromRequest('landlord_id_document')->toMediaCollection('id_document');
        } elseif ($shouldRemove) {
            $detail->clearMediaCollection('id_document');
        }
    }

    private function syncAvatar(Request $request, User $user): void
    {
        if ($request->hasFile('avatar')) {
            $user->addMediaFromRequest('avatar')->toMediaCollection('avatar');
        } elseif ($request->boolean('avatar_remove')) {
            $user->clearMediaCollection('avatar');
        }
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function roleOptions(): array
    {
        return Role::query()->orderBy('name')->get()
            ->map(fn (Role $role) => ['value' => $role->name, 'label' => $role->name])
            ->all();
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function statusOptions(): array
    {
        return array_map(
            fn (UserStatus $status) => ['value' => $status->value, 'label' => $status->label()],
            UserStatus::cases(),
        );
    }
}
