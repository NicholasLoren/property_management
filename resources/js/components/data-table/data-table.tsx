import {
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import type { ColumnDef } from '@tanstack/react-table';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { ReactNode } from 'react';
import type { EmptyStateConfig } from '@/components/data-table/data-table-empty-state';
import { DataTableEmptyState } from '@/components/data-table/data-table-empty-state';
import { DataTableExportMenu } from '@/components/data-table/data-table-export-menu';
import type { DataTablePaginationMeta } from '@/components/data-table/data-table-pagination';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { DataTableViewOptions } from '@/components/data-table/data-table-view-options';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useColumnVisibility } from '@/hooks/use-column-visibility';
import { cn } from '@/lib/utils';

export type SortState = { column: string; dir: 'asc' | 'desc' };

type DataTableProps<TData> = {
    tableId: string;
    columns: ColumnDef<TData>[];
    data: TData[];
    pagination: DataTablePaginationMeta;
    onPageChange: (page: number) => void;
    onPerPageChange: (perPage: number) => void;
    sort: SortState;
    onSortChange: (column: string, dir: 'asc' | 'desc') => void;
    getExportUrl?: (format: 'pdf' | 'excel') => string;
    isFiltered: boolean;
    emptyState: EmptyStateConfig;
    toolbar?: ReactNode;
    /** When set, clicking anywhere on a row (outside interactive cells) opens it. */
    onRowClick?: (row: TData) => void;
};

export function DataTable<TData>({
    tableId,
    columns,
    data,
    pagination,
    onPageChange,
    onPerPageChange,
    sort,
    onSortChange,
    getExportUrl,
    isFiltered,
    emptyState,
    toolbar,
    onRowClick,
}: DataTableProps<TData>) {
    const [columnVisibility, setColumnVisibility] =
        useColumnVisibility(tableId);

    const table = useReactTable({
        data,
        columns,
        state: { columnVisibility },
        onColumnVisibilityChange: setColumnVisibility,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
        manualSorting: true,
        manualFiltering: true,
    });

    function handleSort(sortKey: string) {
        const nextDir =
            sort.column === sortKey && sort.dir === 'asc' ? 'desc' : 'asc';
        onSortChange(sortKey, nextDir);
    }

    return (
        <div>
            <div className="mb-3 flex flex-wrap items-center gap-2.5">
                {toolbar}
                <div className="flex-1" />
                <DataTableViewOptions table={table} />
                {getExportUrl && (
                    <DataTableExportMenu getExportUrl={getExportUrl} />
                )}
            </div>

            <div className="rounded-[14px] border border-border-soft bg-card shadow-sm">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow
                                key={headerGroup.id}
                                className="hover:bg-transparent"
                            >
                                {headerGroup.headers.map((header) => {
                                    const sortKey =
                                        header.column.columnDef.meta?.sortKey;

                                    return (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder ? null : sortKey ? (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleSort(sortKey)
                                                    }
                                                    className="inline-flex items-center gap-1 text-[11px] font-semibold tracking-wide uppercase"
                                                >
                                                    {flexRender(
                                                        header.column.columnDef
                                                            .header,
                                                        header.getContext(),
                                                    )}
                                                    {sort.column === sortKey ? (
                                                        sort.dir === 'asc' ? (
                                                            <ChevronUp className="size-3" />
                                                        ) : (
                                                            <ChevronDown className="size-3" />
                                                        )
                                                    ) : (
                                                        <ChevronDown className="size-3 opacity-30" />
                                                    )}
                                                </button>
                                            ) : (
                                                flexRender(
                                                    header.column.columnDef
                                                        .header,
                                                    header.getContext(),
                                                )
                                            )}
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {data.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="p-0"
                                >
                                    <DataTableEmptyState
                                        isFiltered={isFiltered}
                                        emptyState={emptyState}
                                    />
                                </TableCell>
                            </TableRow>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    onClick={
                                        onRowClick
                                            ? () => onRowClick(row.original)
                                            : undefined
                                    }
                                    className={cn(
                                        onRowClick && 'cursor-pointer',
                                    )}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext(),
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                {data.length > 0 && (
                    <DataTablePagination
                        meta={pagination}
                        onPageChange={onPageChange}
                        onPerPageChange={onPerPageChange}
                    />
                )}
            </div>
        </div>
    );
}
