import type { ColumnDef } from '@tanstack/react-table';
import { formatCurrency } from '@/lib/currency';
import type { ReportPropertyRow } from '@/types/reports';

export function getFinancialsColumns(
    currency: string,
): ColumnDef<ReportPropertyRow>[] {
    return [
        {
            id: 'property_name',
            accessorKey: 'property_name',
            header: 'Property',
            enableHiding: false,
            meta: { label: 'Property', sortKey: 'property_name' },
            cell: ({ row }) => (
                <span className="font-medium">
                    {row.original.property_name}
                </span>
            ),
        },
        {
            id: 'rent_collected',
            accessorKey: 'rent_collected',
            header: 'Rent collected',
            meta: { label: 'Rent collected', sortKey: 'rent_collected' },
            cell: ({ row }) => (
                <span className="text-success">
                    {formatCurrency(row.original.rent_collected, currency)}
                </span>
            ),
        },
        {
            id: 'other_income',
            accessorKey: 'other_income',
            header: 'Other income',
            meta: { label: 'Other income', sortKey: 'other_income' },
            cell: ({ row }) => (
                <span className="text-success">
                    {formatCurrency(row.original.other_income, currency)}
                </span>
            ),
        },
        {
            id: 'total_expense',
            accessorKey: 'total_expense',
            header: 'Expenses',
            meta: { label: 'Expenses', sortKey: 'total_expense' },
            cell: ({ row }) => (
                <span className="text-destructive">
                    {formatCurrency(row.original.total_expense, currency)}
                </span>
            ),
        },
        {
            id: 'net_income',
            accessorKey: 'net_income',
            header: 'Net income',
            meta: { label: 'Net income', sortKey: 'net_income' },
            cell: ({ row }) => (
                <span className="font-semibold">
                    {formatCurrency(row.original.net_income, currency)}
                </span>
            ),
        },
        {
            id: 'occupancy_rate',
            accessorKey: 'occupancy_rate',
            header: 'Occupancy',
            meta: { label: 'Occupancy', sortKey: 'occupancy_rate' },
            cell: ({ row }) => `${row.original.occupancy_rate}%`,
        },
        {
            id: 'maintenance_open',
            accessorKey: 'maintenance_open',
            header: 'Open maintenance',
            meta: { label: 'Open maintenance', sortKey: 'maintenance_open' },
            cell: ({ row }) => row.original.maintenance_open,
        },
    ];
}
