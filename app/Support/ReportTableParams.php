<?php

namespace App\Support;

/**
 * Pagination/sort/search request for a single report table. `page` is
 * null when a report is being built for export — every report method
 * treats that as "skip pagination, return the full default-ordered set,"
 * which keeps PDF/Excel exports byte-identical to the on-screen defaults
 * regardless of whatever the user last sorted/searched/paged to on screen.
 */
final readonly class ReportTableParams
{
    /**
     * @param  'asc'|'desc'  $dir
     */
    public function __construct(
        public ?int $page,
        public ?int $perPage,
        public string $sort,
        public string $dir,
        public string $search,
    ) {}

    public static function forExport(): self
    {
        return new self(null, null, '', 'asc', '');
    }

    public function isPaginated(): bool
    {
        return $this->page !== null && $this->perPage !== null;
    }
}
