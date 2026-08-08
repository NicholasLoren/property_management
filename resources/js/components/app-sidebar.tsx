import { Link, usePage } from '@inertiajs/react';
import {
    Download,
    KeyRound,
    PanelLeftClose,
    PanelLeftOpen,
    Search,
    X,
} from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import { useStewardNavGroups, StewardNavItem } from '@/components/steward-nav';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EntityAvatar } from '@/components/ui/entity-avatar';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { UserMenuContent } from '@/components/user-menu-content';
import { usePwaInstall } from '@/hooks/use-pwa-install';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';

type Props = {
    className?: string;
    collapsed?: boolean;
    onToggleCollapse?: () => void;
};

export function AppSidebar({
    className,
    collapsed = false,
    onToggleCollapse,
}: Props) {
    const { auth, unreadMessagesCount, name, icon } = usePage().props;
    const groups = useStewardNavGroups(unreadMessagesCount);
    const { canInstall, promptInstall } = usePwaInstall();
    const [filter, setFilter] = useState('');

    const visibleGroups = useMemo(() => {
        const query = filter.trim().toLowerCase();

        if (!query) {
            return groups;
        }

        return groups
            .map((group) => ({
                ...group,
                items: group.items.filter((item) =>
                    item.title.toLowerCase().includes(query),
                ),
            }))
            .filter((group) => group.items.length > 0);
    }, [groups, filter]);

    return (
        <aside
            className={cn(
                'flex flex-col border-r border-border-soft bg-surface transition-[width] duration-150',
                collapsed ? 'w-[68px]' : 'w-[240px]',
                className,
            )}
        >
            <div
                className={cn(
                    'flex items-center gap-2 border-b border-border-soft px-[18px] pt-[18px] pb-[14px]',
                    collapsed && 'justify-center px-0',
                )}
            >
                <Link
                    href={dashboard()}
                    className={cn(
                        'flex min-w-0 items-center gap-2',
                        collapsed && 'justify-center',
                    )}
                >
                    <span className="flex size-[26px] shrink-0 items-center justify-center overflow-hidden rounded-[7px] bg-accent-brand text-accent-contrast">
                        {icon ? (
                            <img
                                src={icon}
                                alt=""
                                className="size-full object-cover"
                            />
                        ) : (
                            <KeyRound className="size-[15px]" />
                        )}
                    </span>
                    {!collapsed && (
                        <span className="truncate font-display text-[15.5px] font-extrabold text-foreground">
                            {name}
                        </span>
                    )}
                </Link>
            </div>

            {!collapsed && (
                <div className="px-3 pt-3">
                    <div className="relative">
                        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-[13px] -translate-y-1/2 text-text-tertiary" />
                        <input
                            type="text"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            placeholder="Filter menu…"
                            aria-label="Filter menu"
                            className="h-[30px] w-full rounded-[6px] border border-border-soft bg-secondary/50 pr-7 pl-7 text-[12.5px] text-foreground placeholder:text-text-tertiary focus:border-accent-brand focus:bg-surface focus:ring-1 focus:ring-accent-brand focus:outline-none"
                        />
                        {filter && (
                            <button
                                type="button"
                                onClick={() => setFilter('')}
                                aria-label="Clear filter"
                                className="absolute top-1/2 right-2 -translate-y-1/2 text-text-tertiary hover:text-foreground"
                            >
                                <X className="size-[13px]" />
                            </button>
                        )}
                    </div>
                </div>
            )}

            <nav
                className={cn(
                    'flex-1 overflow-y-auto py-3.5',
                    collapsed ? 'px-2' : 'px-3',
                )}
            >
                {visibleGroups.length === 0 && (
                    <p className="px-2.5 text-[12.5px] text-text-tertiary">
                        No matching menu items.
                    </p>
                )}
                {visibleGroups.map((group, i) => (
                    <Fragment key={group.label ?? i}>
                        <div className="mb-[18px] last:mb-0">
                            {group.label && !collapsed && (
                                <p className="mb-1.5 px-2.5 text-[10.5px] font-semibold tracking-[0.08em] text-text-tertiary uppercase">
                                    {group.label}
                                </p>
                            )}
                            {group.items.map((item) => (
                                <StewardNavItem
                                    key={item.title}
                                    item={item}
                                    collapsed={collapsed}
                                />
                            ))}
                        </div>
                    </Fragment>
                ))}
            </nav>

            {onToggleCollapse && (
                <div
                    className={cn(
                        'border-t border-border-soft p-2',
                        collapsed && 'flex justify-center',
                    )}
                >
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                onClick={onToggleCollapse}
                                aria-label={
                                    collapsed
                                        ? 'Expand sidebar'
                                        : 'Collapse sidebar'
                                }
                                className={cn(
                                    'flex items-center gap-2.5 rounded-[6px] p-2 text-text-tertiary hover:bg-secondary hover:text-foreground',
                                    collapsed ? 'justify-center' : 'w-full',
                                )}
                            >
                                {collapsed ? (
                                    <PanelLeftOpen className="size-[15px]" />
                                ) : (
                                    <>
                                        <PanelLeftClose className="size-[15px]" />
                                        <span className="text-[12.5px] font-medium">
                                            Collapse
                                        </span>
                                    </>
                                )}
                            </button>
                        </TooltipTrigger>
                        {collapsed && (
                            <TooltipContent side="right">
                                Expand sidebar
                            </TooltipContent>
                        )}
                    </Tooltip>
                </div>
            )}

            {auth.user && (
                <div className="border-t border-border-soft p-3">
                    <div
                        className={cn(
                            'flex items-center gap-1',
                            collapsed && 'flex-col gap-2',
                        )}
                    >
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    className={cn(
                                        'flex min-w-0 flex-1 items-center gap-2.5 rounded-[6px] p-2 text-left hover:bg-secondary',
                                        collapsed &&
                                            'w-full flex-none justify-center',
                                    )}
                                >
                                    <EntityAvatar
                                        name={auth.user.name}
                                        seed={auth.user.id}
                                        imageUrl={auth.user.avatar}
                                        className="size-[26px] text-[11px]"
                                    />
                                    {!collapsed && (
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-[12.5px] font-semibold text-foreground">
                                                {auth.user.name}
                                            </span>
                                            <span className="block text-[11px] text-text-tertiary">
                                                {auth.user.role}
                                            </span>
                                        </span>
                                    )}
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                className="w-56 rounded-lg"
                                align="end"
                                side="top"
                            >
                                <UserMenuContent user={auth.user} />
                            </DropdownMenuContent>
                        </DropdownMenu>
                        {canInstall && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        type="button"
                                        onClick={promptInstall}
                                        aria-label="Install app"
                                        className="flex size-[30px] shrink-0 items-center justify-center rounded-[6px] text-text-tertiary hover:bg-secondary hover:text-foreground"
                                    >
                                        <Download className="size-[15px]" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                    Install app
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                </div>
            )}
        </aside>
    );
}
