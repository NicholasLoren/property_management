import { Head, Link, usePage } from '@inertiajs/react';
import {
    Building2,
    Calendar,
    FileText,
    Pencil,
    Tag,
    TrendingUp,
} from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/use-permissions';
import { formatCurrency } from '@/lib/currency';
import { formatDate } from '@/lib/datetime';
import incomes from '@/routes/incomes';

type IncomeShowRow = {
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
};

type PageProps = { income: IncomeShowRow };

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

export default function IncomeShow({ income }: PageProps) {
    const { currency, timezone } = usePage().props;
    const { can } = usePermissions();
    const title = income.description ?? income.category_label ?? 'Income';

    return (
        <>
            <Head title={title} />

            <div className="mb-3">
                <Breadcrumbs
                    breadcrumbs={[
                        { title: 'Income', href: incomes.index() },
                        { title, href: incomes.show(income.id) },
                    ]}
                />
            </div>

            <div className="mb-[22px] flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-[21px] font-extrabold tracking-tight">
                        {title}
                    </h1>
                    <span className="mt-1 block font-mono text-xs text-text-tertiary">
                        {income.code ?? `Income #${income.id}`}
                    </span>
                </div>
                {can('incomes.edit') && (
                    <Button variant="outline" asChild>
                        <Link href={incomes.edit(income.id)}>
                            <Pencil className="size-[15px]" />
                            Edit
                        </Link>
                    </Button>
                )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
                <StatTile
                    icon={TrendingUp}
                    label="Amount"
                    value={formatCurrency(income.amount, currency)}
                />
                <StatTile
                    icon={Calendar}
                    label="Transaction date"
                    value={formatDate(income.transaction_date, timezone)}
                />
                <StatTile
                    icon={Building2}
                    label="Property"
                    value={income.property_name ?? '–'}
                />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <div className="rounded-[14px] border border-border-soft bg-card p-5 shadow-sm lg:col-span-2">
                    <h2 className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-text-secondary">
                        <FileText className="size-[15px]" />
                        Description
                    </h2>
                    <p className="text-sm whitespace-pre-line text-text-secondary">
                        {income.description ?? 'No description provided.'}
                    </p>

                    {income.receipt && (
                        <div className="mt-4 border-t border-border-soft pt-4">
                            <p className="mb-1.5 text-xs font-semibold tracking-wide text-text-tertiary uppercase">
                                Receipt
                            </p>
                            <a
                                href={income.receipt.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[13px] font-medium text-accent-strong hover:underline"
                            >
                                {income.receipt.name}
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
                                {income.category_label ?? '–'}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-text-tertiary">Recorded by</dt>
                            <dd className="text-right font-medium">
                                {income.created_by_name ?? '–'}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-text-tertiary">Recorded on</dt>
                            <dd className="text-right font-medium">
                                {formatDate(income.created_at, timezone)}
                            </dd>
                        </div>
                    </dl>
                </div>
            </div>
        </>
    );
}
