import { Link, usePage } from '@inertiajs/react';
import { BookOpen } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn } from '@/lib/utils';

type DocPage = { slug: string; title: string };

type DocModule = {
    slug: string;
    title: string;
    description?: string;
    pages: DocPage[];
};

export default function DocsLayout({
    manifest,
    children,
}: PropsWithChildren<{ manifest: DocModule[] }>) {
    const { name, icon } = usePage().props;
    const { isCurrentUrl } = useCurrentUrl();

    return (
        <div className="flex min-h-svh bg-surface text-foreground">
            <aside className="flex w-[260px] shrink-0 flex-col border-r border-border-soft bg-secondary/30">
                <Link
                    href="/docs"
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
                        className="block rounded-[6px] px-2.5 py-[7px] text-[13px] font-medium text-text-secondary hover:bg-secondary hover:text-foreground"
                    >
                        ← Back to app
                    </Link>
                </div>
            </aside>

            <main className="mx-auto w-full max-w-[760px] px-8 py-12">
                {children}
            </main>
        </div>
    );
}
