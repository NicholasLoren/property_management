import { Head, Link } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowDown,
    ArrowUp,
    CheckSquare,
    DoorOpen,
    Hourglass,
    Percent,
    Scale,
    ShieldCheck,
    UserPlus,
    Users,
} from 'lucide-react';
import type { ComponentType } from 'react';
import reports from '@/routes/reports';

type ReportItem = {
    slug: string;
    title: string;
    description: string;
    icon: string;
};

type ReportCategory = {
    category: string;
    items: ReportItem[];
};

type PageProps = {
    categories: ReportCategory[];
};

const ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
    ArrowDown,
    ArrowUp,
    Scale,
    Percent,
    AlertTriangle,
    CheckSquare,
    Users,
    UserPlus,
    Hourglass,
    DoorOpen,
    ShieldCheck,
};

export default function ReportsIndex({ categories }: PageProps) {
    return (
        <>
            <Head title="Reports" />

            <div className="mb-[22px]">
                <h1 className="text-[21px] font-extrabold tracking-tight">
                    Reports
                </h1>
                <p className="mt-1 text-[13px] text-text-secondary">
                    Generate, preview and download reports across your
                    properties.
                </p>
            </div>

            <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
                {categories.map((category) => (
                    <div key={category.category}>
                        <p className="mb-3 text-xs font-semibold tracking-wide text-text-tertiary uppercase">
                            {category.category}
                        </p>
                        <div className="grid gap-2.5">
                            {category.items.map((item) => {
                                const Icon = ICON_MAP[item.icon] ?? Scale;

                                return (
                                    <Link
                                        key={item.slug}
                                        href={reports.show(item.slug)}
                                        className="rounded-[14px] border border-border-soft bg-card p-3.5 shadow-sm transition-colors hover:border-accent-brand"
                                    >
                                        <span className="flex size-9 items-center justify-center rounded-[10px] bg-success-soft text-success">
                                            <Icon className="size-[18px]" />
                                        </span>
                                        <div className="mt-2.5 text-[13.5px] font-bold text-foreground">
                                            {item.title}
                                        </div>
                                        <p className="mt-0.5 text-xs leading-relaxed text-text-tertiary">
                                            {item.description}
                                        </p>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}
