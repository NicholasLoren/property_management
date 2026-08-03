<?php

namespace App\Exports;

use App\Models\Role;
use Illuminate\Database\Eloquent\Builder;
use Maatwebsite\Excel\Concerns\Exportable;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

/**
 * @implements WithMapping<Role>
 */
class RolesExport implements FromQuery, WithHeadings, WithMapping
{
    use Exportable;

    /**
     * @param  Builder<Role>  $query
     */
    public function __construct(private readonly Builder $query) {}

    /**
     * @return Builder<Role>
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
        return ['Name', 'Permissions', 'Users'];
    }

    /**
     * @param  Role  $row
     * @return array<int, string>
     */
    public function map($row): array
    {
        return [
            $row->name,
            (string) $row->permissions_count,
            (string) $row->users_count,
        ];
    }
}
