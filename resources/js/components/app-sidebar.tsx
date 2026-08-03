import { Link, usePage } from '@inertiajs/react';
import { KeyRound, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Fragment } from 'react';
import { useStewardNavGroups, StewardNavItem } from '@/components/steward-nav';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { UserMenuContent } from '@/components/user-menu-content';
import { useInitials } from '@/hooks/use-initials';
import { avatarTone, avatarToneClass } from '@/lib/avatar-tone';
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
    const { auth, unreadMessagesCount } = usePage().props;
    const getInitials = useInitials();
    const groups = useStewardNavGroups(auth.can, unreadMessagesCount);

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
                    <span className="flex size-[26px] shrink-0 items-center justify-center rounded-[7px] bg-accent-brand text-accent-contrast">
                        <KeyRound className="size-[15px]" />
                    </span>
                    {!collapsed && (
                        <span className="truncate font-display text-[15.5px] font-extrabold text-foreground">
                            Steward
                        </span>
                    )}
                </Link>
            </div>

            <nav
                className={cn(
                    'flex-1 overflow-y-auto py-3.5',
                    collapsed ? 'px-2' : 'px-3',
                )}
            >
                {groups.map((group, i) => (
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
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                className={cn(
                                    'flex items-center gap-2.5 rounded-[6px] p-2 text-left hover:bg-secondary',
                                    collapsed
                                        ? 'w-full justify-center'
                                        : 'w-full',
                                )}
                            >
                                <span
                                    className={`flex size-[26px] shrink-0 items-center justify-center rounded-full font-display text-[11px] font-bold text-accent-contrast ${avatarToneClass[avatarTone(auth.user.id)]}`}
                                >
                                    {getInitials(auth.user.name)}
                                </span>
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
                </div>
            )}
        </aside>
    );
}
