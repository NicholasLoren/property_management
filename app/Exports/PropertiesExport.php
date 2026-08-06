<?php

namespace App\Exports;

use App\Models\Property;
use Illuminate\Database\Eloquent\Builder;
use Maatwebsite\Excel\Concerns\Exportable;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

/**
 * @implements WithMapping<Property>
 */
class PropertiesExport implements FromQuery, WithHeadings, WithMapping
{
    use Exportable;

    /**
     * @param  Builder<Property>  $query
     */
    public function __construct(private readonly Builder $query) {}

    /**
     * @return Builder<Property>
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
        return ['Name', 'Type', 'Address', 'Landlord', 'Units'];
    }

    /**
     * @param  Property  $row
     * @return array<int, string>
     */
    public function map($row): array
    {
        return [
            $row->name,
            $row->type->label(),
            $row->address,
            $row->landlord->name,
            (string) $row->units_count,
        ];
    }
}
