import { Head, Link } from '@inertiajs/react';
import { Building2, FileText, Pencil } from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/use-permissions';
import landlords from '@/routes/landlords';
import properties from '@/routes/properties';
import users from '@/routes/users';

type LandlordProperty = {
    id: number;
    name: string;
    address: string;
    units_count: number;
};

type LandlordShowRow = {
    id: number;
    name: string;
    email: string;
    id_number: string | null;
    address: string | null;
    phone: string | null;
    notes: string | null;
    id_document: { name: string; url: string } | null;
    properties: LandlordProperty[];
    created_at: string | null;
};

type PageProps = { landlord: LandlordShowRow };

export default function LandlordShow({ landlord }: PageProps) {
    const { can } = usePermissions();

    return (
        <>
            <Head title={landlord.name} />

            <div className="mb-3">
                <Breadcrumbs
                    breadcrumbs={[
                        { title: 'Landlords', href: landlords.index() },
                        {
                            title: landlord.name,
                            href: landlords.show(landlord),
                        },
                    ]}
                />
            </div>

            <div className="mb-[22px] flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-[21px] font-extrabold tracking-tight">
                        {landlord.name}
                    </h1>
                    <p className="mt-1 text-[13px] text-text-secondary">
                        {landlord.email}
                    </p>
                </div>
                {can('users.edit') && (
                    <Button variant="outline" asChild>
                        <Link href={users.edit(landlord)}>
                            <Pencil className="size-[15px]" />
                            Edit in Users
                        </Link>
                    </Button>
                )}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-[14px] border border-border-soft bg-card p-5 shadow-sm lg:col-span-2">
                    <h2 className="mb-3 text-[13px] font-semibold text-text-secondary">
                        Properties
                    </h2>
                    {landlord.properties.length === 0 ? (
                        <p className="text-sm text-text-tertiary">
                            No properties yet.
                        </p>
                    ) : (
                        <div className="divide-y divide-border-soft">
                            {landlord.properties.map((property) => (
                                <Link
                                    key={property.id}
                                    href={properties.show(property)}
                                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 hover:opacity-80"
                                >
                                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-text-tertiary">
                                        <Building2 className="size-4" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-[13px] font-semibold">
                                            {property.name}
                                        </div>
                                        <div className="truncate text-xs text-text-tertiary">
                                            {property.address}
                                        </div>
                                    </div>
                                    <span className="text-xs text-text-tertiary">
                                        {property.units_count} unit
                                        {property.units_count === 1 ? '' : 's'}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                <div className="rounded-[14px] border border-border-soft bg-card p-5 shadow-sm">
                    <h2 className="mb-3 text-[13px] font-semibold text-text-secondary">
                        Profile
                    </h2>
                    <dl className="grid gap-2.5 text-sm">
                        <div className="flex justify-between gap-3">
                            <dt className="text-text-tertiary">
                                ID / registration number
                            </dt>
                            <dd className="text-right font-medium">
                                {landlord.id_number ?? '–'}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-text-tertiary">Address</dt>
                            <dd className="text-right font-medium">
                                {landlord.address ?? '–'}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-text-tertiary">Phone</dt>
                            <dd className="text-right font-medium">
                                {landlord.phone ?? '–'}
                            </dd>
                        </div>
                    </dl>

                    {landlord.notes && (
                        <p className="mt-3 border-t border-border-soft pt-3 text-sm text-text-secondary">
                            {landlord.notes}
                        </p>
                    )}

                    {landlord.id_document && (
                        <a
                            href={landlord.id_document.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 flex items-center gap-2 border-t border-border-soft pt-3 text-[13px] font-medium text-accent-strong hover:underline"
                        >
                            <FileText className="size-[15px]" />
                            {landlord.id_document.name}
                        </a>
                    )}
                </div>
            </div>
        </>
    );
}
