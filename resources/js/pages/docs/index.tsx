import { Head, Link, usePage } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';

type DocPage = { slug: string; title: string };

type DocModule = {
    slug: string;
    title: string;
    description?: string;
    pages: DocPage[];
};

type Props = {
    manifest: DocModule[];
};

export default function DocsIndex({ manifest }: Props) {
    const { name } = usePage().props;

    return (
        <>
            <Head title="Docs" />

            <div className="mb-10">
                <h1 className="font-display text-[26px] font-extrabold tracking-tight">
                    {name ?? 'App'} documentation
                </h1>
                <p className="mt-2 text-[14px] text-text-secondary">
                    Step-by-step guides with screenshots for every feature, from
                    logging in to running reports.
                </p>
            </div>

            <div className="flex flex-col gap-3">
                {manifest.map((mod) => (
                    <div
                        key={mod.slug}
                        className="rounded-[10px] border border-border-soft bg-secondary/20 p-5"
                    >
                        <h2 className="text-[15px] font-bold">{mod.title}</h2>
                        {mod.description && (
                            <p className="mt-1 text-[13px] text-text-secondary">
                                {mod.description}
                            </p>
                        )}
                        <ul className="mt-3 flex flex-col gap-1">
                            {mod.pages.map((page) => (
                                <li key={page.slug}>
                                    <Link
                                        href={`/docs/${mod.slug}/${page.slug}`}
                                        className="flex items-center gap-1 text-[13.5px] font-medium text-accent-strong hover:underline"
                                    >
                                        {page.title}
                                        <ChevronRight className="size-[13px]" />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </>
    );
}
