import { Link } from '@inertiajs/react';
import type { InertiaLinkProps } from '@inertiajs/react';
import { ShieldCheck, Sun, User } from 'lucide-react';
import type { ComponentType, PropsWithChildren } from 'react';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn, toUrl } from '@/lib/utils';
import { edit as editAppearance } from '@/routes/appearance';
import { edit } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';

const NAV_ITEMS: {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon: ComponentType<{ className?: string }>;
}[] = [
    { title: 'Profile', href: edit(), icon: User },
    { title: 'Security', href: editSecurity(), icon: ShieldCheck },
    { title: 'Appearance', href: editAppearance(), icon: Sun },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentOrParentUrl } = useCurrentUrl();

    return (
        <>
            <div className="mb-[22px]">
                <h1 className="text-[21px] font-extrabold tracking-tight">
                    Account settings
                </h1>
                <p className="mt-1 text-[13px] text-text-secondary">
                    Manage your profile, security, and appearance.
                </p>
            </div>

            <div className="grid max-w-[900px] items-start gap-7 md:grid-cols-[200px_1fr]">
                <nav className="flex flex-col gap-0.5 md:sticky md:top-[74px]">
                    {NAV_ITEMS.map((item) => {
                        const active = isCurrentOrParentUrl(item.href);

                        return (
                            <Link
                                key={toUrl(item.href)}
                                href={item.href}
                                className={cn(
                                    'flex items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-left text-[13.5px] font-medium',
                                    active
                                        ? 'bg-accent-soft font-semibold text-accent-strong'
                                        : 'text-text-secondary hover:bg-secondary hover:text-foreground',
                                )}
                            >
                                <item.icon
                                    className={cn(
                                        'size-[15px]',
                                        active
                                            ? 'text-accent-strong'
                                            : 'text-text-tertiary',
                                    )}
                                />
                                {item.title}
                            </Link>
                        );
                    })}
                </nav>

                <div>{children}</div>
            </div>
        </>
    );
}
