import { usePage } from '@inertiajs/react';
import { useState } from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import { AppTopbar } from '@/components/app-topbar';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import type { AppLayoutProps } from '@/types';

function setSidebarCookie(open: boolean): void {
    document.cookie = `sidebar_state=${open};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
}

export default function AppSidebarLayout({ children }: AppLayoutProps) {
    const { sidebarOpen } = usePage().props;
    const [collapsed, setCollapsed] = useState(!sidebarOpen);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    function toggleCollapsed() {
        setCollapsed((value) => {
            setSidebarCookie(value);

            return !value;
        });
    }

    return (
        <div className="flex min-h-screen bg-background">
            <AppSidebar
                className="sticky top-0 hidden h-screen shrink-0 md:flex"
                collapsed={collapsed}
                onToggleCollapse={toggleCollapsed}
            />

            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                <SheetContent
                    side="left"
                    className="w-[240px] p-0 [&>button]:hidden"
                >
                    <SheetTitle className="sr-only">Navigation menu</SheetTitle>
                    <AppSidebar className="flex h-full w-full border-r-0" />
                </SheetContent>
            </Sheet>

            <div className="flex min-w-0 flex-1 flex-col">
                <AppTopbar onOpenMobileNav={() => setMobileNavOpen(true)} />
                <main className="max-w-[1320px] flex-1 px-5 py-6 sm:px-[30px] sm:py-[26px]">
                    {children}
                </main>
            </div>
        </div>
    );
}
