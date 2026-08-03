import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export type DataTablePaginationMeta = {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

export function DataTablePagination({
    meta,
    onPageChange,
    onPerPageChange,
}: {
    meta: DataTablePaginationMeta;
    onPageChange: (page: number) => void;
    onPerPageChange: (perPage: number) => void;
}) {
    const pages = Array.from({ length: meta.last_page }, (_, i) => i + 1);

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-soft px-3.5 py-3">
            <div className="flex items-center gap-1.5 text-[12.5px] text-text-secondary">
                Rows per page
                <Select
                    value={String(meta.per_page)}
                    onValueChange={(value) => onPerPageChange(Number(value))}
                >
                    <SelectTrigger size="sm" className="w-[70px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {[10, 25, 50].map((size) => (
                            <SelectItem key={size} value={String(size)}>
                                {size}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="text-[12.5px] text-text-secondary tabular-nums">
                {meta.total === 0
                    ? 'No results'
                    : `Showing ${meta.from}–${meta.to} of ${meta.total}`}
            </div>

            <div className="flex items-center gap-2.5">
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    disabled={meta.current_page <= 1}
                    onClick={() => onPageChange(meta.current_page - 1)}
                >
                    <ChevronLeft className="size-4" />
                </Button>

                <Select
                    value={String(meta.current_page)}
                    onValueChange={(value) => onPageChange(Number(value))}
                >
                    <SelectTrigger
                        size="sm"
                        className="w-auto gap-1 px-2 text-[12.5px]"
                    >
                        <span className="text-text-secondary">Page</span>
                        <SelectValue />
                        <span className="text-text-secondary">
                            of {meta.last_page}
                        </span>
                    </SelectTrigger>
                    <SelectContent>
                        {pages.map((page) => (
                            <SelectItem key={page} value={String(page)}>
                                {page}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    disabled={meta.current_page >= meta.last_page}
                    onClick={() => onPageChange(meta.current_page + 1)}
                >
                    <ChevronRight className="size-4" />
                </Button>
            </div>
        </div>
    );
}
