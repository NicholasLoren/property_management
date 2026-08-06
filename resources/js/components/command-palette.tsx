import { Link, usePage } from '@inertiajs/react';
import { Building2, IdCard, Plus, Search, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import users from '@/routes/users';

export function CommandPalette({
    canManageUsers,
}: {
    canManageUsers: boolean;
}) {
    const { name } = usePage().props;
    const [open, setOpen] = useState(false);

    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (
                (event.metaKey || event.ctrlKey) &&
                event.key.toLowerCase() === 'k'
            ) {
                event.preventDefault();
                setOpen((value) => !value);
            }
        }

        document.addEventListener('keydown', onKeyDown);

        return () => document.removeEventListener('keydown', onKeyDown);
    }, []);

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex w-80 items-center gap-2.5 rounded-[6px] border border-border-soft bg-secondary px-2.5 py-[7px] text-left text-[13px] text-text-tertiary transition-colors hover:border-text-tertiary"
            >
                <Search className="size-[15px] shrink-0" />
                <span className="flex-1">
                    Search properties, tenants, leases…
                </span>
                <kbd className="rounded border border-border bg-surface px-[5px] py-px font-mono text-[10.5px] text-text-tertiary">
                    ⌘K
                </kbd>
            </button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="top-[16%] max-w-xl translate-y-0 gap-0 overflow-hidden p-0 [&>button]:hidden">
                    <DialogTitle className="sr-only">
                        Search {name}
                    </DialogTitle>
                    <div className="flex items-center gap-2.5 border-b border-border-soft px-4 py-3.5">
                        <Search className="size-4 text-text-tertiary" />
                        <input
                            autoFocus
                            type="text"
                            placeholder="Search properties, tenants, leases, or run a command…"
                            className="flex-1 border-0 bg-transparent text-[15px] text-foreground outline-none placeholder:text-text-tertiary"
                        />
                        <kbd className="rounded border border-border bg-surface px-[5px] py-px font-mono text-[10.5px] text-text-tertiary">
                            Esc
                        </kbd>
                    </div>

                    <div className="max-h-90 overflow-y-auto p-2">
                        <p className="px-2.5 pt-2 pb-1 text-[10.5px] font-bold tracking-[0.07em] text-text-tertiary uppercase">
                            Quick actions
                        </p>
                        {canManageUsers && (
                            <Link
                                href={users.index()}
                                onClick={() => setOpen(false)}
                                className="flex items-center gap-2.5 rounded-[6px] p-2 hover:bg-secondary"
                            >
                                <span className="flex size-[30px] shrink-0 items-center justify-center rounded-[7px] bg-secondary text-text-secondary">
                                    <IdCard className="size-[15px]" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-[13px] font-semibold text-foreground">
                                        Invite user
                                    </span>
                                    <span className="block text-[11.5px] text-text-tertiary">
                                        Send a staff or landlord invitation
                                    </span>
                                </span>
                            </Link>
                        )}
                        <div className="flex cursor-default items-center gap-2.5 rounded-[6px] p-2 opacity-60">
                            <span className="flex size-[30px] shrink-0 items-center justify-center rounded-[7px] bg-secondary text-text-secondary">
                                <Plus className="size-[15px]" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-[13px] font-semibold text-foreground">
                                    Add property
                                </span>
                                <span className="block text-[11.5px] text-text-tertiary">
                                    Not available yet
                                </span>
                            </span>
                        </div>

                        <p className="px-2.5 pt-3 pb-1 text-[10.5px] font-bold tracking-[0.07em] text-text-tertiary uppercase">
                            Properties
                        </p>
                        <div className="flex cursor-default items-center gap-2.5 rounded-[6px] p-2 opacity-60">
                            <span className="flex size-[30px] shrink-0 items-center justify-center rounded-[7px] bg-secondary text-text-secondary">
                                <Building2 className="size-[15px]" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-[13px] font-semibold text-foreground">
                                    Alderwood Residences
                                </span>
                                <span className="block text-[11.5px] text-text-tertiary">
                                    1420 Alder St, Portland, OR · 12 units
                                </span>
                            </span>
                        </div>

                        <p className="px-2.5 pt-3 pb-1 text-[10.5px] font-bold tracking-[0.07em] text-text-tertiary uppercase">
                            Tenants
                        </p>
                        <div className="flex cursor-default items-center gap-2.5 rounded-[6px] p-2 opacity-60">
                            <span className="flex size-[30px] shrink-0 items-center justify-center rounded-[7px] bg-secondary text-text-secondary">
                                <User className="size-[15px]" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-[13px] font-semibold text-foreground">
                                    Marisol Vega
                                </span>
                                <span className="block text-[11.5px] text-text-tertiary">
                                    Alderwood Residences · Unit 4B
                                </span>
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3.5 border-t border-border-soft px-4 py-2.5 text-[11px] text-text-tertiary">
                        <span className="inline-flex items-center gap-1">
                            <kbd className="rounded border border-border bg-surface px-[5px] py-px font-mono text-[10.5px]">
                                ↑↓
                            </kbd>
                            navigate
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <kbd className="rounded border border-border bg-surface px-[5px] py-px font-mono text-[10.5px]">
                                ↵
                            </kbd>
                            select
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <kbd className="rounded border border-border bg-surface px-[5px] py-px font-mono text-[10.5px]">
                                esc
                            </kbd>
                            close
                        </span>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
