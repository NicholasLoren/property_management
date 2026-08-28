import { Head, router, usePage } from '@inertiajs/react';
import { CheckCircle2, Clock, FileWarning } from 'lucide-react';
import { useState } from 'react';
import { SignaturePad } from '@/components/signature-pad';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { formatCurrency } from '@/lib/currency';
import { formatDate } from '@/lib/datetime';
import { store } from '@/routes/signing';

type LeaseSummary = {
    unit_label: string | null;
    start_date: string;
    end_date: string;
    rent_amount: string;
    billing_period_label: string;
    security_deposit: string | null;
};

type Props = {
    status: 'ready' | 'used' | 'expired' | 'not_found';
    token?: string;
    tenantName?: string;
    lease?: LeaseSummary;
};

function StatusNotice({
    icon: Icon,
    title,
    description,
}: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
}) {
    return (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border-soft bg-secondary px-5 py-8 text-center">
            <Icon className="size-8 text-text-tertiary" />
            <div>
                <p className="text-[14px] font-semibold text-foreground">
                    {title}
                </p>
                <p className="mt-1 text-[13px] text-text-secondary">
                    {description}
                </p>
            </div>
        </div>
    );
}

export default function SigningShow({
    status,
    token,
    tenantName,
    lease,
}: Props) {
    const { currency, timezone } = usePage().props;
    const [signatureImage, setSignatureImage] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    function submit() {
        if (!signatureImage || !token) {
            return;
        }

        setSubmitting(true);
        router.post(
            store(token).url,
            { signature_image: signatureImage },
            { onFinish: () => setSubmitting(false) },
        );
    }

    return (
        <>
            <Head title="Sign your tenancy agreement" />

            {status === 'not_found' && (
                <StatusNotice
                    icon={FileWarning}
                    title="Link not found"
                    description="This signing link doesn't match anything on file. Ask your property manager for a new one."
                />
            )}

            {status === 'expired' && (
                <StatusNotice
                    icon={Clock}
                    title="Link expired"
                    description="This signing link has expired. Ask your property manager to send you a new one."
                />
            )}

            {status === 'used' && (
                <StatusNotice
                    icon={CheckCircle2}
                    title="Already signed"
                    description="This tenancy agreement has already been signed. Thank you!"
                />
            )}

            {status === 'ready' && lease && (
                <div className="flex flex-col gap-5">
                    <div className="rounded-lg border border-border-soft p-4">
                        <p className="text-[13px] font-semibold text-foreground">
                            {lease.unit_label ?? 'Tenancy agreement'}
                        </p>
                        <dl className="mt-2 grid gap-1.5 text-[13px]">
                            <div className="flex justify-between gap-3">
                                <dt className="text-text-tertiary">Term</dt>
                                <dd className="text-right font-medium">
                                    {formatDate(lease.start_date, timezone)} –{' '}
                                    {formatDate(lease.end_date, timezone)}
                                </dd>
                            </div>
                            <div className="flex justify-between gap-3">
                                <dt className="text-text-tertiary">Rent</dt>
                                <dd className="text-right font-medium">
                                    {formatCurrency(
                                        lease.rent_amount,
                                        currency,
                                    )}{' '}
                                    / {lease.billing_period_label.toLowerCase()}
                                </dd>
                            </div>
                            {lease.security_deposit && (
                                <div className="flex justify-between gap-3">
                                    <dt className="text-text-tertiary">
                                        Security deposit
                                    </dt>
                                    <dd className="text-right font-medium">
                                        {formatCurrency(
                                            lease.security_deposit,
                                            currency,
                                        )}
                                    </dd>
                                </div>
                            )}
                        </dl>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="tenant_name">Signing as</Label>
                        <Input id="tenant_name" value={tenantName} disabled />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label>Signature</Label>
                        <SignaturePad onChange={setSignatureImage} />
                    </div>

                    <Button
                        disabled={!signatureImage || submitting || !token}
                        onClick={submit}
                    >
                        {submitting && <Spinner />}
                        Sign agreement
                    </Button>
                </div>
            )}
        </>
    );
}

SigningShow.layout = {
    title: 'Sign your tenancy agreement',
    description: 'Review the details below, then sign to confirm.',
};
