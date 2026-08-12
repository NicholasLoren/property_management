import { Head, Link, usePage } from '@inertiajs/react';
import {
    Building2,
    Calendar,
    FileText,
    Pencil,
    Tag,
    TrendingDown,
    Wrench,
} from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/use-permissions';
import { formatCurrency } from '@/lib/currency';
import { formatDate } from '@/lib/datetime';
import expenses from '@/routes/expenses';
import maintenance from '@/routes/maintenance';

type ExpenseShowRow = {
    id: number;
    code: string | null;
    property_name: string | null;
    category_label: string | null;
    amount: string;
    transaction_date: string;
    description: string | null;
    receipt: { name: string; url: string } | null;
    created_by_name: string | null;
    created_at: string | null;
    maintenance_request: { id: number; title: string } | null;
};

type PageProps = { expense: ExpenseShowRow };

function StatTile({
    icon: Icon,
    label,
    value,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-start gap-2.5 rounded-lg border border-border-soft p-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-text-tertiary">
                <Icon className="size-4" />
            </span>
            <div>
                <div className="text-xs text-text-tertiary">{label}</div>
                <div className="text-[13px] font-semibold text-foreground">
                    {value}
                </div>
            </div>
        </div>
    );
}

export default function ExpenseShow({ expense }: PageProps) {
    const { currency, timezone } = usePage().props;
    const { can } = usePermissions();
    const title = expense.description ?? expense.category_label ?? 'Expense';

    return (
        <>
            <Head title={title} />

            <div className="mb-3">
                <Breadcrumbs
                    breadcrumbs={[
                        { title: 'Expenses', href: expenses.index() },
                        { title, href: expenses.show(expense.id) },
                    ]}
                />
            </div>

            <div className="mb-[22px] flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-[21px] font-extrabold tracking-tight">
                        {title}
                    </h1>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-text-tertiary">
                            {expense.code ?? `Expense #${expense.id}`}
                        </span>
                        {expense.maintenance_request && (
                            <Badge variant="outline" className="font-normal">
                                <Wrench className="size-3" />
                                From maintenance
                            </Badge>
                        )}
                    </div>
                </div>
                {can('expenses.edit') && (
                    <Button variant="outline" asChild>
                        <Link href={expenses.edit(expense.id)}>
                            <Pencil className="size-[15px]" />
                            Edit
                        </Link>
                    </Button>
                )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
                <StatTile
                    icon={TrendingDown}
                    label="Amount"
                    value={formatCurrency(expense.amount, currency)}
                />
                <StatTile
                    icon={Calendar}
                    label="Transaction date"
                    value={formatDate(expense.transaction_date, timezone)}
                />
                <StatTile
                    icon={Building2}
                    label="Property"
                    value={expense.property_name ?? '–'}
                />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <div className="rounded-[14px] border border-border-soft bg-card p-5 shadow-sm lg:col-span-2">
                    <h2 className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-text-secondary">
                        <FileText className="size-[15px]" />
                        Description
                    </h2>
                    <p className="text-sm whitespace-pre-line text-text-secondary">
                        {expense.description ?? 'No description provided.'}
                    </p>

                    {expense.receipt && (
                        <div className="mt-4 border-t border-border-soft pt-4">
                            <p className="mb-1.5 text-xs font-semibold tracking-wide text-text-tertiary uppercase">
                                Receipt
                            </p>
                            <a
                                href={expense.receipt.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[13px] font-medium text-accent-strong hover:underline"
                            >
                                {expense.receipt.name}
                            </a>
                        </div>
                    )}
                </div>

                <div className="rounded-[14px] border border-border-soft bg-card p-5 shadow-sm">
                    <h2 className="mb-3 text-[13px] font-semibold text-text-secondary">
                        Summary
                    </h2>
                    <dl className="grid gap-2.5 text-sm">
                        <div className="flex justify-between gap-3">
                            <dt className="flex items-center gap-1.5 text-text-tertiary">
                                <Tag className="size-3.5" />
                                Category
                            </dt>
                            <dd className="text-right font-medium">
                                {expense.category_label ?? '–'}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-text-tertiary">Recorded by</dt>
                            <dd className="text-right font-medium">
                                {expense.created_by_name ?? '–'}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-text-tertiary">Recorded on</dt>
                            <dd className="text-right font-medium">
                                {formatDate(expense.created_at, timezone)}
                            </dd>
                        </div>
                    </dl>

                    {expense.maintenance_request && can('maintenance.view') && (
                        <Link
                            href={maintenance.show(
                                expense.maintenance_request.id,
                            )}
                            className="mt-3 block border-t border-border-soft pt-3 text-[13px] font-medium text-accent-strong hover:underline"
                        >
                            View linked maintenance request →
                        </Link>
                    )}
                </div>
            </div>
        </>
    );
}
