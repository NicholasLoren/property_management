import { Head, Link, usePage } from '@inertiajs/react';
import {
    Building2,
    Calendar,
    DoorOpen,
    History,
    Pencil,
    Sparkles,
} from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/use-permissions';
import { formatCurrency } from '@/lib/currency';
import { formatDate } from '@/lib/datetime';
import properties from '@/routes/properties';
import units from '@/routes/units';

type PropertyContext = { id: number; name: string };

type UnitPriceHistoryEntry = {
    id: number;
    amount: string;
    billing_period_label: string;
    effective_from: string;
    effective_to: string | null;
    is_current: boolean;
};

type UnitShowRow = {
    id: number;
    name: string;
    unit_type_label: string | null;
    size: string | null;
    status: string;
    status_label: string;
    features: { name: string; quantity: number }[];
    price_history: UnitPriceHistoryEntry[];
    photos: { id: number; name: string; url: string }[];
    created_at: string | null;
};

type PageProps = { property: PropertyContext; unit: UnitShowRow };

const STATUS_DOT_CLASS: Record<string, string> = {
    vacant: 'bg-warning',
    occupied: 'bg-success',
};

export default function UnitShow({ property, unit }: PageProps) {
    const { currency, timezone } = usePage().props;
    const { can } = usePermissions();
    const currentPrice = unit.price_history.find((price) => price.is_current);

    return (
        <>
            <Head title={`${unit.name} · ${property.name}`} />

            <div className="mb-3">
                <Breadcrumbs
                    breadcrumbs={[
                        { title: 'Properties', href: properties.index() },
                        {
                            title: property.name,
                            href: properties.show(property),
                        },
                        { title: 'Units', href: units.index(property) },
                        {
                            title: unit.name,
                            href: units.show([property.id, unit.id]),
                        },
                    ]}
                />
            </div>

            <div className="mb-[22px] flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    {unit.photos[0] ? (
                        <img
                            src={unit.photos[0].url}
                            alt=""
                            className="size-12 shrink-0 rounded-xl object-cover"
                        />
                    ) : (
                        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-text-tertiary">
                            <DoorOpen className="size-5" />
                        </span>
                    )}
                    <div>
                        <h1 className="text-[21px] font-extrabold tracking-tight">
                            {unit.name}
                        </h1>
                        <Link
                            href={properties.show(property)}
                            className="mt-0.5 flex items-center gap-1.5 text-[13px] text-text-secondary hover:text-accent-strong hover:underline"
                        >
                            <Building2 className="size-3.5" />
                            {property.name}
                        </Link>
                    </div>
                </div>
                {can('units.edit') && (
                    <Button asChild variant="outline">
                        <Link href={units.edit([property.id, unit.id])}>
                            <Pencil className="size-[15px]" />
                            Edit
                        </Link>
                    </Button>
                )}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-[14px] border border-border-soft bg-card p-5 shadow-sm lg:col-span-2">
                    <p className="mb-3 text-xs font-semibold tracking-wide text-text-tertiary uppercase">
                        Details
                    </p>
                    <dl className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <dt className="text-xs text-text-tertiary">
                                Unit type
                            </dt>
                            <dd className="mt-1 text-[13px] text-foreground">
                                {unit.unit_type_label ?? '–'}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs text-text-tertiary">Size</dt>
                            <dd className="mt-1 text-[13px] text-foreground">
                                {unit.size ?? '–'}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs text-text-tertiary">
                                Status
                            </dt>
                            <dd className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-foreground">
                                <span
                                    className={`size-[7px] rounded-full ${STATUS_DOT_CLASS[unit.status]}`}
                                />
                                {unit.status_label}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs text-text-tertiary">
                                Current price
                            </dt>
                            <dd className="mt-1 text-[13px] text-foreground">
                                {currentPrice
                                    ? `${formatCurrency(currentPrice.amount, currency)} / ${currentPrice.billing_period_label.toLowerCase()}`
                                    : '–'}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs text-text-tertiary">
                                Added
                            </dt>
                            <dd className="mt-1 flex items-center gap-1.5 text-[13px] text-text-secondary">
                                <Calendar className="size-3.5 text-text-tertiary" />
                                {formatDate(unit.created_at, timezone)}
                            </dd>
                        </div>
                    </dl>

                    {unit.features.length > 0 && (
                        <div className="mt-5 border-t border-border-soft pt-4">
                            <p className="mb-2 flex items-center gap-1.5 text-xs text-text-tertiary">
                                <Sparkles className="size-3.5" />
                                Features
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {unit.features.map((feature) => (
                                    <Badge
                                        key={feature.name}
                                        variant="outline"
                                        className="font-normal"
                                    >
                                        {feature.name} × {feature.quantity}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="mt-5 border-t border-border-soft pt-4">
                        <p className="mb-3 flex items-center gap-1.5 text-xs text-text-tertiary">
                            <History className="size-3.5" />
                            Price history
                        </p>
                        {unit.price_history.length > 0 ? (
                            <ul className="grid gap-2.5">
                                {unit.price_history.map((price) => (
                                    <li
                                        key={price.id}
                                        className="flex items-center justify-between rounded-lg border border-border-soft px-3 py-2"
                                    >
                                        <div>
                                            <div className="text-[13px] font-semibold text-foreground">
                                                {formatCurrency(
                                                    price.amount,
                                                    currency,
                                                )}{' '}
                                                /{' '}
                                                {price.billing_period_label.toLowerCase()}
                                            </div>
                                            <div className="text-xs text-text-tertiary">
                                                {formatDate(
                                                    price.effective_from,
                                                    timezone,
                                                )}{' '}
                                                –{' '}
                                                {price.effective_to
                                                    ? formatDate(
                                                          price.effective_to,
                                                          timezone,
                                                      )
                                                    : 'now'}
                                            </div>
                                        </div>
                                        {price.is_current && (
                                            <Badge className="bg-success-soft text-success">
                                                Current
                                            </Badge>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-[13px] text-text-tertiary">
                                No price has been set for this unit yet.
                            </p>
                        )}
                    </div>
                </div>

                {unit.photos.length > 0 && (
                    <div className="rounded-[14px] border border-border-soft bg-card p-5 shadow-sm">
                        <p className="mb-3 text-xs font-semibold tracking-wide text-text-tertiary uppercase">
                            Photos
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            {unit.photos.map((photo) => (
                                <a
                                    key={photo.id}
                                    href={photo.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="aspect-square overflow-hidden rounded-lg"
                                >
                                    <img
                                        src={photo.url}
                                        alt={photo.name}
                                        className="size-full object-cover transition-opacity hover:opacity-80"
                                    />
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
