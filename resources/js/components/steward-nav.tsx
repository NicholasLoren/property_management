import { Link } from '@inertiajs/react';
import type { InertiaLinkProps } from '@inertiajs/react';
import {
    Activity,
    BarChart3,
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
    Sparkles,
    TrendingDown,
    TrendingUp,
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
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import companySettings from '@/routes/company-settings';
import documents from '@/routes/documents';
import expenses from '@/routes/expenses';
import extras from '@/routes/extras';
import incomes from '@/routes/incomes';
import landlords from '@/routes/landlords';
import leases from '@/routes/leases';
import logs from '@/routes/logs';
import maintenance from '@/routes/maintenance';
import messages from '@/routes/messages';
import payments from '@/routes/payments';
import properties from '@/routes/properties';
import reports from '@/routes/reports';
import roles from '@/routes/roles';
import tenants from '@/routes/tenants';
import units from '@/routes/units';
import users from '@/routes/users';

type NavEntry = {
    title: string;
    icon: ComponentType<{ className?: string }>;
    href?: NonNullable<InertiaLinkProps['href']>;
    count?: number;
    /**
     * When set, the item is active for any URL under this prefix, not just
     * an exact match on `href` — e.g. Settings' per-section URLs.
     */
    activePrefix?: string;
};

type NavGroup = {
    label?: string;
    items: NavEntry[];
};

export function useStewardNavGroups(unreadMessagesCount = 0): NavGroup[] {
    const { can } = usePermissions();

    return [
        {
            items: [
                { title: 'Dashboard', icon: LayoutGrid, href: dashboard() },
            ],
        },
        {
            label: 'Portfolio',
            items: [
                {
                    title: 'Landlords',
                    icon: KeyRound,
                    href: can('landlords.view') ? landlords.index() : undefined,
                },
                {
                    title: 'Properties',
                    icon: Building2,
                    href: can('properties.view')
                        ? properties.index()
                        : undefined,
                },
                {
                    title: 'Units',
                    icon: DoorOpen,
                    href: can('units.view') ? units.all() : undefined,
                },
                {
                    title: 'Leases',
                    icon: FileText,
                    href: can('leases.view') ? leases.index() : undefined,
                },
            ],
        },
        {
            label: 'Operations',
            items: [
                {
                    title: 'Maintenance',
                    icon: Wrench,
                    href: can('maintenance.view')
                        ? maintenance.index()
                        : undefined,
                },
                {
                    title: 'Documents',
                    icon: Folder,
                    href: can('documents.view') ? documents.index() : undefined,
                },
                {
                    title: 'Messages',
                    icon: Mail,
                    href: can('messages.view') ? messages.index() : undefined,
                    count:
                        can('messages.view') && unreadMessagesCount > 0
                            ? unreadMessagesCount
                            : undefined,
                },
            ],
        },
        {
            label: 'Finance',
            items: [
                {
                    title: 'Payments',
                    icon: CreditCard,
                    href: can('payments.view') ? payments.index() : undefined,
                },
                {
                    title: 'Income',
                    icon: TrendingUp,
                    href: can('incomes.view') ? incomes.index() : undefined,
                },
                {
                    title: 'Expenses',
                    icon: TrendingDown,
                    href: can('expenses.view') ? expenses.index() : undefined,
                },
                {
                    title: 'Reports',
                    icon: BarChart3,
                    href: can('reports.view') ? reports.index() : undefined,
                },
            ],
        },
        {
            label: 'People',
            items: [
                {
                    title: 'Tenants',
                    icon: UsersIcon,
                    href: can('tenants.view') ? tenants.index() : undefined,
                },
                {
                    title: 'Users',
                    icon: IdCard,
                    href: can('users.view') ? users.index() : undefined,
                },
            ],
        },
        {
            label: 'Admin',
            items: [
                {
                    title: 'Activity log',
                    icon: Activity,
                    href: can('logs.view') ? logs.index() : undefined,
                },
                {
                    title: 'Roles',
                    icon: ShieldCheck,
                    href: can('roles.view') ? roles.index() : undefined,
                },
                {
                    title: 'Extras',
                    icon: Sparkles,
                    href: can('extras.view')
                        ? extras.index('expense-categories')
                        : undefined,
                    activePrefix: '/extras',
                },
                {
                    title: 'Settings',
                    icon: SettingsIcon,
                    href: can('settings.edit')
                        ? companySettings.edit('general')
                        : undefined,
                    activePrefix: '/company-settings',
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
    const { isCurrentUrl, isCurrentOrParentUrl } = useCurrentUrl();
    const Icon = item.icon;
    const active = item.href
        ? item.activePrefix
            ? isCurrentOrParentUrl(item.activePrefix)
            : isCurrentUrl(item.href)
        : false;

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
