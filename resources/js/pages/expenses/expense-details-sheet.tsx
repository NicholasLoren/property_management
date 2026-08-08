import { Link, usePage } from '@inertiajs/react';
import { FileText, TrendingDown, Wrench } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { formatCurrency } from '@/lib/currency';
import { formatDate, formatDateTime } from '@/lib/datetime';
import expenses from '@/routes/expenses';
import maintenance from '@/routes/maintenance';

export type ExpenseDetail = {
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

export function ExpenseDetailsSheet({
    expenseId,
    onOpenChange,
}: {
    expenseId: number | null;
    onOpenChange: (open: boolean) => void;
}) {
    const { currency, timezone } = usePage().props;
    const [expense, setExpense] = useState<ExpenseDetail | null>(null);

    useEffect(() => {
        if (expenseId === null) {
            return;
        }

        let cancelled = false;

        fetch(expenses.show(expenseId).url, {
            headers: { Accept: 'application/json' },
        })
            .then((response) => response.json())
            .then((data: { expense: ExpenseDetail }) => {
                if (!cancelled) {
                    setExpense(data.expense);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [expenseId]);

    const displayedExpense = expense?.id === expenseId ? expense : null;

    return (
        <Sheet open={expenseId !== null} onOpenChange={onOpenChange}>
            <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
                {displayedExpense && (
                    <>
                        <SheetHeader className="border-b border-border-soft">
                            <SheetTitle className="text-[15px]">
                                {displayedExpense.description ??
                                    displayedExpense.category_label}
                            </SheetTitle>
                            <SheetDescription>
                                {displayedExpense.code ??
                                    `Expense #${displayedExpense.id}`}{' '}
                                ·{' '}
                                {formatDate(
                                    displayedExpense.transaction_date,
                                    timezone,
                                )}
                            </SheetDescription>
                        </SheetHeader>

                        <div className="flex flex-col gap-5 p-4">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-text-tertiary">
                                    <TrendingDown className="size-4" />
                                </span>
                                <span className="text-xl font-semibold text-destructive">
                                    -
                                    {formatCurrency(
                                        displayedExpense.amount,
                                        currency,
                                    )}
                                </span>
                                {displayedExpense.maintenance_request && (
                                    <span title="Created from a maintenance request">
                                        <Wrench className="size-[15px] text-text-tertiary" />
                                    </span>
                                )}
                            </div>

                            <div className="border-t border-border-soft pt-4">
                                <p className="mb-2.5 text-xs font-semibold tracking-wide text-text-tertiary uppercase">
                                    Details
                                </p>
                                <dl className="grid gap-3">
                                    <div>
                                        <dt className="text-xs text-text-tertiary">
                                            Property
                                        </dt>
                                        <dd className="mt-0.5 text-[13px] text-foreground">
                                            {displayedExpense.property_name ??
                                                '—'}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-text-tertiary">
                                            Category
                                        </dt>
                                        <dd className="mt-0.5">
                                            <Badge variant="outline">
                                                {displayedExpense.category_label ??
                                                    '—'}
                                            </Badge>
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-text-tertiary">
                                            Transaction date
                                        </dt>
                                        <dd className="mt-0.5 text-[13px] text-foreground">
                                            {formatDate(
                                                displayedExpense.transaction_date,
                                                timezone,
                                            )}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-text-tertiary">
                                            Receipt
                                        </dt>
                                        <dd className="mt-0.5 text-[13px] text-foreground">
                                            {displayedExpense.receipt ? (
                                                <a
                                                    href={
                                                        displayedExpense.receipt
                                                            .url
                                                    }
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 text-accent-strong hover:underline"
                                                >
                                                    <FileText className="size-3.5 shrink-0" />
                                                    {
                                                        displayedExpense.receipt
                                                            .name
                                                    }
                                                </a>
                                            ) : (
                                                '—'
                                            )}
                                        </dd>
                                    </div>
                                    {displayedExpense.maintenance_request && (
                                        <div>
                                            <dt className="text-xs text-text-tertiary">
                                                Maintenance request
                                            </dt>
                                            <dd className="mt-0.5 text-[13px]">
                                                <Link
                                                    href={maintenance.show(
                                                        displayedExpense
                                                            .maintenance_request
                                                            .id,
                                                    )}
                                                    className="inline-flex items-center gap-1.5 text-accent-strong hover:underline"
                                                >
                                                    <Wrench className="size-3.5 shrink-0" />
                                                    {
                                                        displayedExpense
                                                            .maintenance_request
                                                            .title
                                                    }
                                                </Link>
                                            </dd>
                                        </div>
                                    )}
                                    <div>
                                        <dt className="text-xs text-text-tertiary">
                                            Recorded by
                                        </dt>
                                        <dd className="mt-0.5 text-[13px] text-foreground">
                                            {displayedExpense.created_by_name ??
                                                '—'}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-text-tertiary">
                                            Recorded on
                                        </dt>
                                        <dd className="mt-0.5 text-[13px] text-foreground">
                                            {formatDateTime(
                                                displayedExpense.created_at,
                                                timezone,
                                            )}
                                        </dd>
                                    </div>
                                </dl>
                            </div>
                        </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}
