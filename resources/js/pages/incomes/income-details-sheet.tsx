import { usePage } from '@inertiajs/react';
import { FileText, TrendingUp } from 'lucide-react';
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
import incomes from '@/routes/incomes';

export type IncomeDetail = {
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

export function IncomeDetailsSheet({
    incomeId,
    onOpenChange,
}: {
    incomeId: number | null;
    onOpenChange: (open: boolean) => void;
}) {
    const { currency, timezone } = usePage().props;
    const [income, setIncome] = useState<IncomeDetail | null>(null);

    useEffect(() => {
        if (incomeId === null) {
            return;
        }

        let cancelled = false;

        fetch(incomes.preview(incomeId).url, {
            headers: { Accept: 'application/json' },
        })
            .then((response) => response.json())
            .then((data: { income: IncomeDetail }) => {
                if (!cancelled) {
                    setIncome(data.income);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [incomeId]);

    const displayedIncome = income?.id === incomeId ? income : null;

    return (
        <Sheet open={incomeId !== null} onOpenChange={onOpenChange}>
            <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
                {displayedIncome && (
                    <>
                        <SheetHeader className="border-b border-border-soft">
                            <SheetTitle className="text-[15px]">
                                {displayedIncome.description ??
                                    displayedIncome.category_label}
                            </SheetTitle>
                            <SheetDescription>
                                {displayedIncome.code ??
                                    `Income #${displayedIncome.id}`}{' '}
                                ·{' '}
                                {formatDate(
                                    displayedIncome.transaction_date,
                                    timezone,
                                )}
                            </SheetDescription>
                        </SheetHeader>

                        <div className="flex flex-col gap-5 p-4">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-text-tertiary">
                                    <TrendingUp className="size-4" />
                                </span>
                                <span className="text-xl font-semibold text-success">
                                    +
                                    {formatCurrency(
                                        displayedIncome.amount,
                                        currency,
                                    )}
                                </span>
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
                                            {displayedIncome.property_name ??
                                                '—'}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-text-tertiary">
                                            Category
                                        </dt>
                                        <dd className="mt-0.5">
                                            <Badge variant="outline">
                                                {displayedIncome.category_label ??
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
                                                displayedIncome.transaction_date,
                                                timezone,
                                            )}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-text-tertiary">
                                            Receipt
                                        </dt>
                                        <dd className="mt-0.5 text-[13px] text-foreground">
                                            {displayedIncome.receipt ? (
                                                <a
                                                    href={
                                                        displayedIncome.receipt
                                                            .url
                                                    }
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 text-accent-strong hover:underline"
                                                >
                                                    <FileText className="size-3.5 shrink-0" />
                                                    {
                                                        displayedIncome.receipt
                                                            .name
                                                    }
                                                </a>
                                            ) : (
                                                '—'
                                            )}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-text-tertiary">
                                            Recorded by
                                        </dt>
                                        <dd className="mt-0.5 text-[13px] text-foreground">
                                            {displayedIncome.created_by_name ??
                                                '—'}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-text-tertiary">
                                            Recorded on
                                        </dt>
                                        <dd className="mt-0.5 text-[13px] text-foreground">
                                            {formatDateTime(
                                                displayedIncome.created_at,
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
