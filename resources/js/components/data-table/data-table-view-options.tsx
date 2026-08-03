import type { Table } from '@tanstack/react-table';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function DataTableViewOptions<TData>({
    table,
}: {
    table: Table<TData>;
}) {
    const hideableColumns = table
        .getAllColumns()
        .filter((column) => column.getCanHide());

    if (hideableColumns.length === 0) {
        return null;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                    <SlidersHorizontal className="size-[15px]" />
                    Columns
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {hideableColumns.map((column) => (
                    <DropdownMenuCheckboxItem
                        key={column.id}
                        checked={column.getIsVisible()}
                        onCheckedChange={(checked) =>
                            column.toggleVisibility(checked === true)
                        }
                        onSelect={(e) => e.preventDefault()}
                    >
                        {column.columnDef.meta?.label ?? column.id}
                    </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
