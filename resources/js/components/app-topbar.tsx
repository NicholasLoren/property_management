import { Link, usePage } from '@inertiajs/react';
import { Bell, Download, Menu, Moon, Settings as SettingsIcon, Sun } from 'lucide-react';
import { CommandPalette } from '@/components/command-palette';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserMenuContent } from '@/components/user-menu-content';
import { useAppearance } from '@/hooks/use-appearance';
import { useInitials } from '@/hooks/use-initials';
import { usePermissions } from '@/hooks/use-permissions';
import { usePwaInstall } from '@/hooks/use-pwa-install';
import { avatarTone, avatarToneClass } from '@/lib/avatar-tone';
import companySettings from '@/routes/company-settings';
import { edit as editProfile } from '@/routes/profile';

export function AppTopbar({
    onOpenMobileNav,
}: {
    onOpenMobileNav?: () => void;
}) {
    const { auth } = usePage().props;
    const { can } = usePermissions();
    const getInitials = useInitials();
    const { resolvedAppearance, updateAppearance } = useAppearance();
    const isDark = resolvedAppearance === 'dark';
    const { canInstall, promptInstall } = usePwaInstall();

    return (
        <div className="sticky top-0 z-10 flex h-[58px] shrink-0 items-center justify-between gap-4 border-b border-border-soft bg-surface px-[22px]">
            <div className="flex items-center gap-3">
                {onOpenMobileNav && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="-ml-2 md:hidden"
                        onClick={onOpenMobileNav}
                    >
                        <Menu className="size-5" />
                    </Button>
                )}
                <div className="hidden sm:block">
                    <CommandPalette canManageUsers={can('users.view')} />
                </div>
            </div>

            <div className="flex items-center gap-1.5">
                {canInstall && (
                    <button
                        type="button"
                        onClick={promptInstall}
                        aria-label="Install app"
                        title="Install app"
                        className="flex size-[30px] items-center justify-center rounded-[6px] text-text-secondary hover:bg-secondary hover:text-foreground"
                    >
                        <Download className="size-[15px]" />
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => updateAppearance(isDark ? 'light' : 'dark')}
                    aria-label={
                        isDark ? 'Switch to light mode' : 'Switch to dark mode'
                    }
                    className="flex size-[30px] items-center justify-center rounded-[6px] text-text-secondary hover:bg-secondary hover:text-foreground"
                >
                    {isDark ? (
                        <Sun className="size-[15px]" />
                    ) : (
                        <Moon className="size-[15px]" />
                    )}
                </button>
                <span className="relative">
                    <span className="flex size-[30px] items-center justify-center rounded-[6px] text-text-secondary">
                        <Bell className="size-[15px]" />
                    </span>
                    <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full border-[1.5px] border-surface bg-destructive" />
                </span>
                {auth.user && (
                    <Link
                        href={
                            can('settings.edit')
                                ? companySettings.edit('general')
                                : editProfile()
                        }
                        className="flex size-[30px] items-center justify-center rounded-[6px] text-text-secondary hover:bg-secondary hover:text-foreground"
                    >
                        <SettingsIcon className="size-[15px]" />
                    </Link>
                )}
                {auth.user && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                className={`ml-1.5 flex size-[26px] shrink-0 items-center justify-center rounded-full font-display text-[11px] font-bold text-accent-contrast ${avatarToneClass[avatarTone(auth.user.id)]}`}
                            >
                                {getInitials(auth.user.name)}
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            className="w-56 rounded-lg"
                            align="end"
                        >
                            <UserMenuContent user={auth.user} />
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </div>
    );
}
