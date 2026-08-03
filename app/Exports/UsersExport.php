<?php

namespace App\Exports;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Maatwebsite\Excel\Concerns\Exportable;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

/**
 * @implements WithMapping<User>
 */
class UsersExport implements FromQuery, WithHeadings, WithMapping
{
    use Exportable;

    /**
     * @param  Builder<User>  $query
     */
    public function __construct(private readonly Builder $query) {}

    /**
     * @return Builder<User>
     */
    public function query(): Builder
    {
        return $this->query;
    }

    /**
     * @return array<int, string>
     */
    public function headings(): array
    {
        return ['Name', 'Email', 'Role', 'Status', 'Last active'];
    }

    /**
     * @param  User  $row
     * @return array<int, string>
     */
    public function map($row): array
    {
        $role = $row->roles->first();

        return [
            $row->name,
            $row->email,
            $role !== null ? $role->name : 'No role',
            $row->status->label(),
            $row->last_active_at?->toDateTimeString() ?? 'Never',
        ];
    }
}
