<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\Exportable;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;

/**
 * Exports a precomputed table of rows (the Reports page's per-property
 * breakdown) — unlike PropertiesExport, there's no single Eloquent query
 * backing this data, it's an aggregate built across several models, so
 * FromArray is used instead of FromQuery.
 */
class ReportExport implements FromArray, WithHeadings
{
    use Exportable;

    /**
     * @param  array<int, array<int, string>>  $rows
     * @param  array<int, string>  $headings
     */
    public function __construct(private readonly array $rows, private readonly array $headings) {}

    /**
     * @return array<int, array<int, string>>
     */
    public function array(): array
    {
        return $this->rows;
    }

    /**
     * @return array<int, string>
     */
    public function headings(): array
    {
        return $this->headings;
    }
}
