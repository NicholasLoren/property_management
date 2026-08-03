import { Link, usePage } from '@inertiajs/react';
import { Activity, Building2, KeyRound, ShieldCheck } from 'lucide-react';
import type { ComponentType } from 'react';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

const FEATURES: {
    title: string;
    description: string;
    icon: ComponentType<{ className?: string }>;
}[] = [
    {
        title: 'Portfolio oversight',
        description:
            "Every landlord's properties, units, and rent roll in view",
        icon: Building2,
    },
    {
        title: 'Granular permissions',
        description: 'Access is scoped down to the individual action',
        icon: ShieldCheck,
    },
    {
        title: 'Full audit trail',
        description: 'Every change is logged and attributed automatically',
        icon: Activity,
    },
];

export default function AuthSplitLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    const { name } = usePage().props;

    return (
        <div className="grid min-h-svh lg:grid-cols-[minmax(320px,460px)_1fr]">
            <aside className="relative hidden flex-col justify-between overflow-hidden bg-[var(--inverse-bg)] p-11 text-[var(--inverse-text)] lg:flex">
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-50"
                    style={{
                        backgroundImage:
                            'repeating-linear-gradient(180deg, transparent, transparent 63px, rgba(79,191,164,0.08) 63px, rgba(79,191,164,0.08) 64px), repeating-linear-gradient(90deg, transparent, transparent 63px, rgba(79,191,164,0.05) 63px, rgba(79,191,164,0.05) 64px)',
                        maskImage:
                            'radial-gradient(ellipse 80% 60% at 30% 20%, black, transparent 75%)',
                    }}
                />

                <Link
                    href={home()}
                    className="relative z-10 flex items-center gap-2.5"
                >
                    <span className="flex size-8 items-center justify-center rounded-lg bg-accent-brand text-accent-contrast">
                        <KeyRound className="size-4" />
                    </span>
                    <span className="font-display text-lg font-extrabold tracking-tight text-[var(--inverse-text)]">
                        {name}
                    </span>
                </Link>

                <div className="relative z-10 max-w-[380px]">
                    <h1 className="text-[28px] leading-[1.22] font-extrabold tracking-tight text-[var(--inverse-text)]">
                        Every property you manage, in one ledger.
                    </h1>
                    <p className="mt-3 text-[14.5px] leading-relaxed text-[var(--inverse-text-secondary)]">
                        {name} keeps landlords, units, leases, and maintenance
                        in sync, with a full record of who did what and when.
                    </p>
                </div>

                <div className="relative z-10 flex flex-col gap-4">
                    {FEATURES.map((feature) => (
                        <div
                            key={feature.title}
                            className="flex items-start gap-3"
                        >
                            <span className="flex size-[30px] shrink-0 items-center justify-center rounded-lg border border-[var(--inverse-border)] bg-white/[0.06] text-accent-strong">
                                <feature.icon className="size-[15px]" />
                            </span>
                            <span>
                                <strong className="block text-[13.5px] font-semibold text-[var(--inverse-text)]">
                                    {feature.title}
                                </strong>
                                <span className="text-[12.5px] text-[var(--inverse-text-secondary)]">
                                    {feature.description}
                                </span>
                            </span>
                        </div>
                    ))}
                </div>
            </aside>

            <div className="flex items-center justify-center px-6 py-10 sm:px-10">
                <div className="w-full max-w-[360px]">
                    <Link
                        href={home()}
                        className="mb-8 flex items-center justify-center gap-2 lg:hidden"
                    >
                        <span className="flex size-8 items-center justify-center rounded-lg bg-accent-brand text-accent-contrast">
                            <KeyRound className="size-4" />
                        </span>
                        <span className="font-display text-lg font-extrabold text-foreground">
                            {name}
                        </span>
                    </Link>

                    <div className="mb-7">
                        <h2 className="text-[22px] font-extrabold tracking-tight">
                            {title}
                        </h2>
                        {description && (
                            <p className="mt-1.5 text-[13.5px] text-text-secondary">
                                {description}
                            </p>
                        )}
                    </div>

                    {children}
                </div>
            </div>
        </div>
    );
}
