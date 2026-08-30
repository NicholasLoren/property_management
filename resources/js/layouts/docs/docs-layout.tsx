import { Link, usePage } from '@inertiajs/react';
import { BookOpen, Menu } from 'lucide-react';
import { type PropsWithChildren, useState } from 'react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn } from '@/lib/utils';

type DocPage = { slug: string; title: string };

type DocModule = {
    slug: string;
    title: string;
    description?: string;
    pages: DocPage[];
};

function DocsNav({
    manifest,
    name,
    icon,
    onNavigate,
}: {
    manifest: DocModule[];
    name: string;
    icon: string | null;
    onNavigate?: () => void;
}) {
    const { isCurrentUrl } = useCurrentUrl();

    return (
        <div className="flex h-full flex-col">
            <Link
                href="/docs"
                onClick={onNavigate}
                className="flex items-center gap-2.5 border-b border-border-soft px-5 py-4"
            >
                <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md bg-accent-brand text-accent-contrast">
                    {icon ? (
                        <img
                            src={icon}
                            alt=""
                            className="size-full object-cover"
                        />
                    ) : (
                        <BookOpen className="size-4" />
                    )}
                </span>
                <span className="font-display text-[14.5px] font-extrabold">
                    {name ?? 'App'} docs
                </span>
            </Link>

            <nav className="flex-1 overflow-y-auto px-3 py-4">
                {manifest.map((mod) => (
                    <div key={mod.slug} className="mb-5 last:mb-0">
                        <p className="mb-1.5 px-2.5 text-[10.5px] font-semibold tracking-[0.08em] text-text-tertiary uppercase">
                            {mod.title}
                        </p>
                        {mod.pages.map((page) => {
                            const href = `/docs/${mod.slug}/${page.slug}`;
                            const active = isCurrentUrl(href);

                            return (
                                <Link
                                    key={page.slug}
                                    href={href}
                                    onClick={onNavigate}
                                    className={cn(
                                        'mb-px block rounded-[6px] px-2.5 py-[7px] text-[13px] font-medium text-text-secondary hover:bg-secondary hover:text-foreground',
                                        active &&
                                            'bg-accent-soft font-semibold text-accent-strong',
                                    )}
                                >
                                    {page.title}
                                </Link>
                            );
                        })}
                    </div>
                ))}
            </nav>

            <div className="border-t border-border-soft p-3">
                <Link
                    href="/dashboard"
                    onClick={onNavigate}
                    className="block rounded-[6px] px-2.5 py-[7px] text-[13px] font-medium text-text-secondary hover:bg-secondary hover:text-foreground"
                >
                    ← Back to app
                </Link>
            </div>
        </div>
    );
}

export default function DocsLayout({
    manifest,
    children,
}: PropsWithChildren<{ manifest: DocModule[] }>) {
    const { name, icon } = usePage().props;
    const [navOpen, setNavOpen] = useState(false);

    return (
        <div className="flex min-h-svh flex-col bg-surface text-foreground md:flex-row">
            <aside className="sticky top-0 z-30 hidden h-svh w-[260px] shrink-0 flex-col border-r border-border-soft bg-secondary/30 md:flex">
                <DocsNav manifest={manifest} name={name} icon={icon} />
            </aside>

            <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border-soft bg-surface px-4 py-3 md:hidden">
                <button
                    type="button"
                    onClick={() => setNavOpen(true)}
                    className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border-soft text-text-secondary hover:bg-secondary hover:text-foreground"
                    aria-label="Open documentation menu"
                >
                    <Menu className="size-4" />
                </button>
                <span className="font-display text-[14.5px] font-extrabold">
                    {name ?? 'App'} docs
                </span>
            </header>

            <Sheet open={navOpen} onOpenChange={setNavOpen}>
                <SheetContent
                    side="left"
                    className="w-[280px] gap-0 p-0 sm:max-w-[280px]"
                >
                    <SheetHeader className="sr-only">
                        <SheetTitle>Documentation navigation</SheetTitle>
                    </SheetHeader>
                    <DocsNav
                        manifest={manifest}
                        name={name}
                        icon={icon}
                        onNavigate={() => setNavOpen(false)}
                    />
                </SheetContent>
            </Sheet>

            <main className="mx-auto w-full max-w-[760px] flex-1 px-4 py-8 sm:px-6 md:px-8 md:py-12">
                {children}
            </main>
        </div>
    );
}
