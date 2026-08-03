import { Link } from '@inertiajs/react';
import type { InertiaLinkProps } from '@inertiajs/react';
import {
    Activity,
    Building2,
    CreditCard,
    DoorOpen,
    FileText,
    Folder,
    IdCard,
    KeyRound,
    LayoutGrid,
    Mail,
    Settings as SettingsIcon,
    ShieldCheck,
    Trash2,
    Users as UsersIcon,
    Wrench,
} from 'lucide-react';
import type { ComponentType } from 'react';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import companySettings from '@/routes/company-settings';
import logs from '@/routes/logs';
import messages from '@/routes/messages';
import roles from '@/routes/roles';
import users from '@/routes/users';
import type { Abilities } from '@/types/auth';

type NavEntry = {
    title: string;
    icon: ComponentType<{ className?: string }>;
    href?: NonNullable<InertiaLinkProps['href']>;
    count?: number;
};

type NavGroup = {
    label?: string;
    items: NavEntry[];
};

export function useStewardNavGroups(
    can: Abilities,
    unreadMessagesCount = 0,
): NavGroup[] {
    return [
        {
            items: [
                { title: 'Dashboard', icon: LayoutGrid, href: dashboard() },
            ],
        },
        {
            label: 'Portfolio',
            items: [
                { title: 'Landlords', icon: KeyRound, count: 32 },
                { title: 'Properties', icon: Building2, count: 86 },
                { title: 'Units', icon: DoorOpen, count: 238 },
                { title: 'Leases', icon: FileText, count: 214 },
            ],
        },
        {
            label: 'Operations',
            items: [
                { title: 'Payments', icon: CreditCard },
                { title: 'Maintenance', icon: Wrench, count: 14 },
                { title: 'Documents', icon: Folder },
                {
                    title: 'Messages',
                    icon: Mail,
                    href: can.messages.view ? messages.index() : undefined,
                    count:
                        can.messages.view && unreadMessagesCount > 0
                            ? unreadMessagesCount
                            : undefined,
                },
            ],
        },
        {
            label: 'People',
            items: [
                { title: 'Tenants', icon: UsersIcon },
                {
                    title: 'Users',
                    icon: IdCard,
                    href: can.users.view ? users.index() : undefined,
                },
            ],
        },
        {
            label: 'Admin',
            items: [
                {
                    title: 'Activity log',
                    icon: Activity,
                    href: can.logs.view ? logs.index() : undefined,
                },
                { title: 'Trash', icon: Trash2 },
                {
                    title: 'Roles',
                    icon: ShieldCheck,
                    href: can.roles.view ? roles.index() : undefined,
                },
                {
                    title: 'Settings',
                    icon: SettingsIcon,
                    href: can.settings.edit
                        ? companySettings.edit()
                        : undefined,
                },
            ],
        },
    ];
}

export function StewardNavItem({
    item,
    collapsed = false,
}: {
    item: NavEntry;
    collapsed?: boolean;
}) {
    const { isCurrentUrl } = useCurrentUrl();
    const Icon = item.icon;
    const active = item.href ? isCurrentUrl(item.href) : false;

    const className = cn(
        'group mb-px flex items-center gap-2.5 rounded-[6px] px-2.5 py-[7px] text-[13.5px] font-medium',
        collapsed && 'justify-center px-0',
        active
            ? 'bg-accent-soft font-semibold text-accent-strong'
            : 'text-text-secondary',
        item.href && !active && 'hover:bg-secondary hover:text-foreground',
        !item.href && 'cursor-default',
    );

    const content = (
        <>
            <Icon
                className={cn(
                    'size-[18px] shrink-0',
                    active ? 'text-accent-strong' : 'text-text-tertiary',
                )}
            />
            {!collapsed && (
                <>
                    <span>{item.title}</span>
                    {item.count !== undefined && (
                        <span className="ml-auto font-mono text-[11px] text-text-tertiary">
                            {item.count}
                        </span>
                    )}
                </>
            )}
        </>
    );

    const element = !item.href ? (
        <div className={className}>{content}</div>
    ) : (
        <Link href={item.href} prefetch className={className}>
            {content}
        </Link>
    );

    if (!collapsed) {
        return element;
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>{element}</TooltipTrigger>
            <TooltipContent side="right">
                {item.title}
                {item.count !== undefined ? ` (${item.count})` : ''}
            </TooltipContent>
        </Tooltip>
    );
}
