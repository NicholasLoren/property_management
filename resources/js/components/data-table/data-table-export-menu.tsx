import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function DataTableExportMenu({
    getExportUrl,
}: {
    getExportUrl: (format: 'pdf' | 'excel') => string;
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                    <Download className="size-[15px]" />
                    Export
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                    <a href={getExportUrl('pdf')}>
                        <FileText />
                        Export as PDF
                    </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <a href={getExportUrl('excel')}>
                        <FileSpreadsheet />
                        Export as Excel
                    </a>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
