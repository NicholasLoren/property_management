import { Head, Link, router, usePage } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import {
    Banknote,
    Calendar,
    CalendarClock,
    CheckCircle2,
    Download,
    FileText,
    Mail,
    Pencil,
    PenLine,
    Wallet,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { DataTable } from '@/components/data-table/data-table';
import type { DataTablePaginationMeta } from '@/components/data-table/data-table-pagination';
import { SignaturePad } from '@/components/signature-pad';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import { EntityAvatar } from '@/components/ui/entity-avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePermissions } from '@/hooks/use-permissions';
import { formatCurrency } from '@/lib/currency';
import { formatDate } from '@/lib/datetime';
import leases from '@/routes/leases';
import leaseSignatures from '@/routes/leases/signatures';
import leaseSigningLinks from '@/routes/leases/signing-links';
import payments from '@/routes/payments';
import tenants from '@/routes/tenants';
import type { LeaseDocument } from '@/types/leases';

type LeaseTenant = {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
};

type LeaseLandlord = {
    id: number;
    name: string;
};

type LeaseSignatureRow = {
    id: number;
    signer_role: 'landlord' | 'tenant';
    tenant_id: number | null;
    signer_name: string;
    signed_at: string;
};

type LeasePayment = {
    id: number;
    amount: string;
    payment_date: string;
    method_label: string;
    status: string;
    status_label: string;
    reference: string | null;
};

type LeasePaymentsSummary = {
    total_collected: string;
    payments_count: number;
};

type LeaseShowRow = {
    id: number;
    lease_number: string | null;
    unit: { id: number; name: string; property_name: string | null } | null;
    landlord: LeaseLandlord | null;
    tenants: LeaseTenant[];
    signatures: LeaseSignatureRow[];
    start_date: string;
    end_date: string;
    rent_amount: string;
    billing_period_label: string;
    billing_day: number;
    security_deposit: string | null;
    status: string;
    status_label: string;
    notes: string | null;
    document: LeaseDocument | null;
    payments: LeasePayment[];
    payments_summary: LeasePaymentsSummary;
    created_at: string | null;
};

type ScheduleTab = 'payments' | 'schedule';

type ScheduleFilters = {
    tab: ScheduleTab;
    sort: string;
    dir: 'asc' | 'desc';
    per_page: number;
    page: number;
};

type ScheduleRow = {
    id: number;
    period_start: string;
    period_end: string;
    amount_expected: string;
    amount_paid: string;
    status: string;
    status_label: string;
    is_overdue: boolean;
};

type ScheduleTable = { data: ScheduleRow[]; meta: DataTablePaginationMeta };

type PageProps = {
    lease: LeaseShowRow;
    scheduleFilters: ScheduleFilters;
    scheduleTable?: ScheduleTable;
};

const STATUS_BADGE_CLASS: Record<string, string> = {
    draft: 'bg-secondary text-text-secondary',
    active: 'bg-success-soft text-success',
    ended: 'bg-secondary text-text-secondary',
    terminated: 'bg-destructive/10 text-destructive',
};

const PAYMENT_STATUS_CLASS: Record<string, string> = {
    completed: 'bg-success-soft text-success',
    refunded: 'bg-warning-soft text-warning',
    failed: 'bg-destructive/10 text-destructive',
};

const SCHEDULE_STATUS_CLASS: Record<string, string> = {
    pending: 'bg-secondary text-text-secondary',
    partial: 'bg-warning-soft text-warning',
    paid: 'bg-success-soft text-success',
    voided: 'bg-secondary text-text-secondary',
    written_off: 'bg-secondary text-text-secondary',
};

function getScheduleColumns(opts: {
    currency: string;
    timezone: string;
}): ColumnDef<ScheduleRow>[] {
    return [
        {
            id: 'period',
            header: 'Period',
            enableHiding: false,
            meta: { label: 'Period', sortKey: 'period_start' },
            cell: ({ row }) => (
                <span className="text-[13px] font-semibold text-foreground">
                    {formatDate(row.original.period_start, opts.timezone)} –{' '}
                    {formatDate(row.original.period_end, opts.timezone)}
                </span>
            ),
        },
        {
            id: 'amount_expected',
            header: 'Expected',
            meta: { label: 'Expected', sortKey: 'amount_expected' },
            cell: ({ row }) => (
                <span className="text-[13px] text-text-secondary">
                    {formatCurrency(
                        row.original.amount_expected,
                        opts.currency,
                    )}
                </span>
            ),
        },
        {
            id: 'amount_paid',
            header: 'Paid',
            meta: { label: 'Paid' },
            cell: ({ row }) => (
                <span className="text-[13px] text-text-secondary">
                    {formatCurrency(row.original.amount_paid, opts.currency)}
                </span>
            ),
        },
        {
            id: 'status',
            header: 'Status',
            meta: { label: 'Status', sortKey: 'status' },
            cell: ({ row }) =>
                row.original.is_overdue ? (
                    <Badge className="bg-destructive/10 text-destructive">
                        Overdue
                    </Badge>
                ) : (
                    <Badge
                        className={SCHEDULE_STATUS_CLASS[row.original.status]}
                    >
                        {row.original.status_label}
                    </Badge>
                ),
        },
    ];
}

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

type SignTarget = {
    role: 'landlord' | 'tenant';
    tenantId?: number;
    label: string;
};

function SignatureRow({
    label,
    sublabel,
    signature,
    timezone,
    canEdit,
    onSign,
    onSendLink,
}: {
    label: string;
    sublabel?: string | null;
    signature: LeaseSignatureRow | undefined;
    timezone: string;
    canEdit: boolean;
    onSign: () => void;
    onSendLink?: () => void;
}) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border-soft px-3 py-2.5">
            <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold text-foreground">
                    {label}
                </div>
                <div className="truncate text-xs text-text-tertiary">
                    {signature ? (
                        <span className="inline-flex items-center gap-1 text-success">
                            <CheckCircle2 className="size-3.5" />
                            Signed {formatDate(signature.signed_at, timezone)}
                        </span>
                    ) : (
                        (sublabel ?? 'Not yet signed')
                    )}
                </div>
            </div>
            {canEdit && !signature && (
                <div className="flex shrink-0 items-center gap-2">
                    {onSendLink && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onSendLink}
                        >
                            <Mail className="size-3.5" />
                            Send link
                        </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={onSign}>
                        <PenLine className="size-3.5" />
                        Sign now
                    </Button>
                </div>
            )}
        </div>
    );
}

function SignaturesPanel({
    lease,
    timezone,
    canEdit,
}: {
    lease: LeaseShowRow;
    timezone: string;
    canEdit: boolean;
}) {
    const [target, setTarget] = useState<SignTarget | null>(null);
    const [signatureImage, setSignatureImage] = useState<string | null>(null);
    const [signerName, setSignerName] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const landlordSignature = lease.signatures.find(
        (s) => s.signer_role === 'landlord',
    );

    function openDialog(target: SignTarget, defaultName: string) {
        setTarget(target);
        setSignerName(defaultName);
        setSignatureImage(null);
    }

    function closeDialog() {
        setTarget(null);
        setSignatureImage(null);
        setSignerName('');
    }

    function submitSignature() {
        if (!target || !signatureImage || !signerName.trim()) {
            return;
        }

        setSubmitting(true);
        router.post(
            leaseSignatures.store(lease).url,
            {
                signer_role: target.role,
                tenant_id: target.tenantId ?? null,
                signer_name: signerName.trim(),
                signature_image: signatureImage,
            },
            {
                preserveScroll: true,
                onSuccess: () => closeDialog(),
                onFinish: () => setSubmitting(false),
            },
        );
    }

    function sendLink(tenantId: number) {
        router.post(
            leaseSigningLinks.store(lease).url,
            { tenant_id: tenantId },
            { preserveScroll: true },
        );
    }

    return (
        <div className="mt-4 rounded-[14px] border border-border-soft bg-card p-5 shadow-sm">
            <h2 className="mb-3 text-[13px] font-semibold text-text-secondary">
                Signatures
            </h2>
            <div className="grid gap-2">
                <SignatureRow
                    label={`Landlord — ${lease.landlord?.name ?? '—'}`}
                    signature={landlordSignature}
                    timezone={timezone}
                    canEdit={canEdit && lease.landlord !== null}
                    onSign={() =>
                        openDialog(
                            { role: 'landlord', label: 'Landlord' },
                            lease.landlord?.name ?? '',
                        )
                    }
                />
                {lease.tenants.map((tenant) => {
                    const signature = lease.signatures.find(
                        (s) =>
                            s.signer_role === 'tenant' &&
                            s.tenant_id === tenant.id,
                    );

                    return (
                        <SignatureRow
                            key={tenant.id}
                            label={`Tenant — ${tenant.name}`}
                            sublabel={
                                !tenant.email && !tenant.phone
                                    ? 'Not yet signed (no email/phone on file for a remote link)'
                                    : undefined
                            }
                            signature={signature}
                            timezone={timezone}
                            canEdit={canEdit}
                            onSign={() =>
                                openDialog(
                                    {
                                        role: 'tenant',
                                        tenantId: tenant.id,
                                        label: tenant.name,
                                    },
                                    tenant.name,
                                )
                            }
                            onSendLink={() => sendLink(tenant.id)}
                        />
                    );
                })}
            </div>

            <Dialog
                open={target !== null}
                onOpenChange={(open) => !open && closeDialog()}
            >
                <DialogContent>
                    <DialogTitle>Sign as {target?.label}</DialogTitle>
                    <DialogDescription>
                        This records a witnessed, in-person signature against
                        this lease.
                    </DialogDescription>

                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="signer_name">Signer name</Label>
                            <Input
                                id="signer_name"
                                value={signerName}
                                onChange={(e) => setSignerName(e.target.value)}
                            />
                        </div>

                        <SignaturePad onChange={setSignatureImage} />
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="secondary" onClick={closeDialog}>
                            Cancel
                        </Button>
                        <Button
                            disabled={
                                !signatureImage ||
                                !signerName.trim() ||
                                submitting
                            }
                            onClick={submitSignature}
                        >
                            {submitting && <Spinner />}
                            Save signature
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function LeaseShow({
    lease,
    scheduleFilters,
    scheduleTable,
}: PageProps) {
    const { currency, timezone } = usePage().props;
    const { can } = usePermissions();
    const [isRefreshing, setIsRefreshing] = useState(false);

    function loadSchedule(next: Partial<ScheduleFilters> = {}) {
        const params = {
            ...scheduleFilters,
            ...next,
            tab: 'schedule' as const,
        };
        setIsRefreshing(true);

        router.get(
            leases.show(lease).url,
            {
                tab: params.tab,
                sort: params.sort,
                dir: params.dir,
                per_page: params.per_page,
                page: params.page,
            },
            {
                only: ['scheduleTable', 'scheduleFilters'],
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onFinish: () => setIsRefreshing(false),
            },
        );
    }

    function switchTab(tab: ScheduleTab) {
        if (tab === 'schedule') {
            loadSchedule({ page: 1 });

            return;
        }

        router.get(
            leases.show(lease).url,
            { tab },
            {
                only: ['scheduleFilters'],
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    }

    const scheduleColumns = useMemo(
        () => getScheduleColumns({ currency, timezone }),
        [currency, timezone],
    );

    const isInitialScheduleLoad =
        scheduleFilters.tab === 'schedule' && !scheduleTable;

    const schedulePagination = scheduleTable?.meta ?? {
        current_page: 1,
        last_page: 1,
        per_page: scheduleFilters.per_page,
        total: 0,
        from: null,
        to: null,
    };

    return (
        <>
            <Head title={`Lease #${lease.id}`} />

            <div className="mb-3">
                <Breadcrumbs
                    breadcrumbs={[
                        { title: 'Leases', href: leases.index() },
                        {
                            title: `Lease #${lease.id}`,
                            href: leases.show(lease),
                        },
                    ]}
                />
            </div>

            <div className="mb-[22px] flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-[21px] font-extrabold tracking-tight">
                        {lease.unit?.name} — {lease.unit?.property_name}
                    </h1>
                    <div className="mt-1 flex items-center gap-2">
                        <Badge className={STATUS_BADGE_CLASS[lease.status]}>
                            {lease.status_label}
                        </Badge>
                        {lease.lease_number && (
                            <span className="text-[13px] font-medium text-text-secondary">
                                {lease.lease_number}
                            </span>
                        )}
                        <span className="inline-flex items-center gap-1.5 text-[13px] text-text-secondary">
                            <Calendar className="size-3.5 text-text-tertiary" />
                            {formatDate(lease.start_date, timezone)} –{' '}
                            {formatDate(lease.end_date, timezone)}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" asChild>
                        <a
                            href={leases.agreement(lease).url}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Download className="size-[15px]" />
                            Download agreement
                        </a>
                    </Button>
                    {can('leases.edit') && (
                        <Button variant="outline" asChild>
                            <Link href={leases.edit(lease)}>
                                <Pencil className="size-[15px]" />
                                Edit
                            </Link>
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
                <StatTile
                    icon={Wallet}
                    label="Rent"
                    value={`${formatCurrency(lease.rent_amount, currency)} / ${lease.billing_period_label.toLowerCase()}`}
                />
                <StatTile
                    icon={Banknote}
                    label="Total collected"
                    value={formatCurrency(
                        lease.payments_summary.total_collected,
                        currency,
                    )}
                />
                <StatTile
                    icon={FileText}
                    label="Payments recorded"
                    value={`${lease.payments_summary.payments_count}`}
                />
                <StatTile
                    icon={Calendar}
                    label="Security deposit"
                    value={
                        lease.security_deposit
                            ? formatCurrency(lease.security_deposit, currency)
                            : '–'
                    }
                />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <div className="rounded-[14px] border border-border-soft bg-card p-5 shadow-sm lg:col-span-2">
                    <h2 className="mb-3 text-[13px] font-semibold text-text-secondary">
                        Tenants
                    </h2>
                    {lease.tenants.length === 0 ? (
                        <p className="text-sm text-text-tertiary">
                            No tenants attached.
                        </p>
                    ) : (
                        <div className="grid gap-2 sm:grid-cols-2">
                            {lease.tenants.map((tenant) => (
                                <Link
                                    key={tenant.id}
                                    href={tenants.show(tenant)}
                                    className="flex items-center gap-2.5 rounded-lg border border-border-soft px-3 py-2.5 hover:border-accent-brand"
                                >
                                    <EntityAvatar
                                        name={tenant.name}
                                        seed={tenant.id}
                                        className="size-8 text-xs"
                                    />
                                    <div className="min-w-0">
                                        <div className="truncate text-[13px] font-semibold text-foreground">
                                            {tenant.name}
                                        </div>
                                        <div className="truncate text-xs text-text-tertiary">
                                            {tenant.email ??
                                                tenant.phone ??
                                                '–'}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}

                    {lease.notes && (
                        <p className="mt-3 border-t border-border-soft pt-3 text-sm whitespace-pre-line text-text-secondary">
                            {lease.notes}
                        </p>
                    )}
                </div>

                <div className="rounded-[14px] border border-border-soft bg-card p-5 shadow-sm">
                    <h2 className="mb-3 text-[13px] font-semibold text-text-secondary">
                        Terms
                    </h2>
                    <dl className="grid gap-2.5 text-sm">
                        <div className="flex justify-between gap-3">
                            <dt className="text-text-tertiary">Rent</dt>
                            <dd className="text-right font-medium">
                                {formatCurrency(lease.rent_amount, currency)}{' '}
                                <span className="text-text-tertiary">
                                    / {lease.billing_period_label.toLowerCase()}
                                </span>
                            </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-text-tertiary">Rent due day</dt>
                            <dd className="text-right font-medium">
                                Day {lease.billing_day} of each cycle
                            </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-text-tertiary">
                                Security deposit
                            </dt>
                            <dd className="text-right font-medium">
                                {lease.security_deposit
                                    ? formatCurrency(
                                          lease.security_deposit,
                                          currency,
                                      )
                                    : '–'}
                            </dd>
                        </div>
                    </dl>

                    {lease.document && (
                        <a
                            href={lease.document.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 flex items-center gap-2 border-t border-border-soft pt-3 text-[13px] font-medium text-accent-strong hover:underline"
                        >
                            <FileText className="size-[15px]" />
                            {lease.document.name}
                        </a>
                    )}
                </div>
            </div>

            <SignaturesPanel
                lease={lease}
                timezone={timezone}
                canEdit={can('leases.edit')}
            />

            <div className="mt-4 rounded-[14px] border border-border-soft bg-card p-5 shadow-sm">
                <Tabs
                    value={scheduleFilters.tab}
                    onValueChange={(value) => switchTab(value as ScheduleTab)}
                >
                    <TabsList>
                        <TabsTrigger value="payments">
                            <Banknote className="size-3.5" />
                            Payment history
                        </TabsTrigger>
                        <TabsTrigger value="schedule">
                            <CalendarClock className="size-3.5" />
                            Payment Schedule
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="payments" className="pt-4">
                        {lease.payments.length > 0 ? (
                            <ul className="grid gap-2">
                                {lease.payments.map((payment) => {
                                    const row = (
                                        <div className="flex items-center justify-between gap-3 rounded-lg border border-border-soft px-3 py-2.5">
                                            <div>
                                                <div className="text-[13px] font-semibold text-foreground">
                                                    {formatCurrency(
                                                        payment.amount,
                                                        currency,
                                                    )}
                                                </div>
                                                <div className="text-xs text-text-tertiary">
                                                    {formatDate(
                                                        payment.payment_date,
                                                        timezone,
                                                    )}{' '}
                                                    · {payment.method_label}
                                                    {payment.reference &&
                                                        ` · ${payment.reference}`}
                                                </div>
                                            </div>
                                            <Badge
                                                className={
                                                    PAYMENT_STATUS_CLASS[
                                                        payment.status
                                                    ]
                                                }
                                            >
                                                {payment.status_label}
                                            </Badge>
                                        </div>
                                    );

                                    return (
                                        <li key={payment.id}>
                                            {can('payments.edit') ? (
                                                <Link
                                                    href={payments.edit(
                                                        payment.id,
                                                    )}
                                                    className="block hover:opacity-80"
                                                >
                                                    {row}
                                                </Link>
                                            ) : (
                                                row
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <p className="rounded-lg border border-dashed border-border-soft px-3 py-6 text-center text-[13px] text-text-tertiary">
                                No payments have been recorded against this
                                lease yet.
                            </p>
                        )}
                    </TabsContent>

                    <TabsContent value="schedule" className="pt-4">
                        <DataTable
                            tableId="lease-payment-schedule"
                            columns={scheduleColumns}
                            data={scheduleTable?.data ?? []}
                            pagination={schedulePagination}
                            onPageChange={(page) => loadSchedule({ page })}
                            onPerPageChange={(per_page) =>
                                loadSchedule({ per_page, page: 1 })
                            }
                            sort={{
                                column: scheduleFilters.sort,
                                dir: scheduleFilters.dir,
                            }}
                            onSortChange={(column, dir) =>
                                loadSchedule({ sort: column, dir, page: 1 })
                            }
                            onRefresh={() => loadSchedule()}
                            isRefreshing={isRefreshing || isInitialScheduleLoad}
                            isFiltered={false}
                            emptyState={{
                                icon: CalendarClock,
                                title: 'No schedule yet',
                                description:
                                    'Billing periods are generated once this lease is Active.',
                            }}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
}
