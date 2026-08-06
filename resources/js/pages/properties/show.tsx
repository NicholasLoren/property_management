import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Bath,
    BedDouble,
    Calendar,
    DoorOpen,
    KeyRound,
    Mail,
    Pencil,
    Percent,
    Sparkles,
    Wallet,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PhotoCarousel } from '@/components/ui/photo-carousel';
import { usePermissions } from '@/hooks/use-permissions';
import { formatCurrency } from '@/lib/currency';
import properties from '@/routes/properties';
import units from '@/routes/units';
import type { PropertyPhoto } from '@/types/properties';

type QuickFacts = {
    total: number;
    vacant: number;
    occupied: number;
    bedrooms: number | null;
    bathrooms: number | null;
};

type PriceSummary = {
    low: string | null;
    median: string | null;
    high: string | null;
    billing_period_label: string | null;
};

type PropertyShowRow = {
    id: number;
    name: string;
    type: string;
    type_label: string;
    address: string;
    latitude: number | null;
    longitude: number | null;
    description: string | null;
    landlord: { id: number; name: string; email: string } | null;
    amenities: string[];
    photos: PropertyPhoto[];
    units_count: number;
    units: { id: number; name: string }[];
    quick_facts: QuickFacts;
    price_summary: PriceSummary;
    created_at: string | null;
};

type PageProps = { property: PropertyShowRow };

const DESCRIPTION_PREVIEW_LENGTH = 220;

function formatDaysAgo(iso: string | null): string {
    if (!iso) {
        return '–';
    }

    const days = Math.floor(
        (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24),
    );

    if (days < 1) {
        return 'Today';
    }

    return `${days} day${days === 1 ? '' : 's'} ago`;
}

function StatTile({
    icon: Icon,
    label,
    value,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-start gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-text-tertiary">
                <Icon className="size-4" />
            </span>
            <div>
                <div className="text-xs text-text-tertiary">{label}</div>
                <div className="text-[13px] font-semibold text-foreground">
                    {value}
                </div>
            </div>
        </div>
    );
}

type LocationMapProps = { latitude: number; longitude: number };

export default function PropertyShow({ property }: PageProps) {
    const { currency } = usePage().props;
    const { can } = usePermissions();
    const [descriptionExpanded, setDescriptionExpanded] = useState(false);
    const [LocationMap, setLocationMap] =
        useState<ComponentType<LocationMapProps> | null>(null);

    useEffect(() => {
        let active = true;

        import('@/components/ui/property-location-map').then((mod) => {
            if (active) {
                setLocationMap(() => mod.default);
            }
        });

        return () => {
            active = false;
        };
    }, []);

    const { quick_facts: facts, price_summary: price } = property;
    const occupancyRate =
        facts.total > 0
            ? Math.round((facts.occupied / facts.total) * 100)
            : null;

    const priceSubtitle = price.low
        ? `From ${formatCurrency(price.low, currency)}${price.billing_period_label ? ` / ${price.billing_period_label.toLowerCase()}` : ''}`
        : 'No pricing set yet';

    const description = property.description ?? '';
    const isLongDescription = description.length > DESCRIPTION_PREVIEW_LENGTH;
    const shownDescription =
        isLongDescription && !descriptionExpanded
            ? `${description.slice(0, DESCRIPTION_PREVIEW_LENGTH).trimEnd()}…`
            : description;

    const quickFactChips = [
        facts.bedrooms !== null && {
            icon: BedDouble,
            label: `${facts.bedrooms} Bed${facts.bedrooms === 1 ? '' : 's'}`,
        },
        facts.bathrooms !== null && {
            icon: Bath,
            label: `${facts.bathrooms} Bath${facts.bathrooms === 1 ? '' : 's'}`,
        },
        {
            icon: DoorOpen,
            label: `${facts.total} Unit${facts.total === 1 ? '' : 's'}`,
        },
        occupancyRate !== null && {
            icon: Percent,
            label: `${occupancyRate}% occupied`,
        },
    ].filter((chip): chip is { icon: typeof BedDouble; label: string } =>
        Boolean(chip),
    );

    return (
        <>
            <Head title={property.name} />

            <div className="mb-3">
                <Breadcrumbs
                    breadcrumbs={[
                        { title: 'Properties', href: properties.index() },
                        {
                            title: property.name,
                            href: properties.show(property),
                        },
                    ]}
                />
            </div>

            <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-[21px] font-extrabold tracking-tight">
                            {property.name}
                        </h1>
                        <Badge variant="outline">{property.type_label}</Badge>
                    </div>
                    <p className="mt-1 text-[13px] text-text-secondary">
                        {property.address}
                    </p>
                    <p className="mt-1 text-[13px] font-semibold text-success">
                        {priceSubtitle}
                    </p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                        {quickFactChips.map((chip) => (
                            <span
                                key={chip.label}
                                className="inline-flex items-center gap-1.5 text-[13px] text-text-secondary"
                            >
                                <chip.icon className="size-4 text-text-tertiary" />
                                {chip.label}
                            </span>
                        ))}
                    </div>
                </div>
                {can('properties.edit') && (
                    <Button asChild>
                        <Link href={properties.edit(property)}>
                            <Pencil className="size-[15px]" />
                            Edit property
                        </Link>
                    </Button>
                )}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <PhotoCarousel photos={property.photos} />

                <div className="rounded-[14px] border border-border-soft bg-card p-5 shadow-sm">
                    <h2 className="text-[15px] font-bold text-foreground">
                        About this property
                    </h2>
                    {description && (
                        <p className="mt-2 text-[13px] text-text-secondary">
                            {shownDescription}{' '}
                            {isLongDescription && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setDescriptionExpanded((v) => !v)
                                    }
                                    className="font-semibold text-accent-strong hover:underline"
                                >
                                    {descriptionExpanded
                                        ? 'Show less'
                                        : 'Read more'}
                                </button>
                            )}
                        </p>
                    )}

                    <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border-soft pt-4 sm:grid-cols-3">
                        <StatTile
                            icon={DoorOpen}
                            label="Units"
                            value={`${facts.total}`}
                        />
                        <StatTile
                            icon={Percent}
                            label="Occupancy"
                            value={
                                occupancyRate !== null
                                    ? `${occupancyRate}%`
                                    : '–'
                            }
                        />
                        <StatTile
                            icon={Calendar}
                            label="Listed"
                            value={formatDaysAgo(property.created_at)}
                        />
                    </div>

                    <div className="mt-4 border-t border-border-soft pt-4">
                        <div className="mb-2 flex items-center justify-between">
                            <p className="flex items-center gap-1.5 text-xs text-text-tertiary">
                                <Wallet className="size-3.5" />
                                Price range
                            </p>
                            {price.low && (
                                <Badge
                                    variant="outline"
                                    className="font-normal"
                                >
                                    {facts.total} unit
                                    {facts.total === 1 ? '' : 's'} priced
                                </Badge>
                            )}
                        </div>
                        {price.low ? (
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <div className="text-xs text-text-tertiary">
                                        Low
                                    </div>
                                    <div className="text-[13px] font-semibold text-foreground">
                                        {formatCurrency(price.low, currency)}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-text-tertiary">
                                        Median
                                    </div>
                                    <div className="text-[13px] font-semibold text-foreground">
                                        {price.median
                                            ? formatCurrency(
                                                  price.median,
                                                  currency,
                                              )
                                            : '–'}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-text-tertiary">
                                        High
                                    </div>
                                    <div className="text-[13px] font-semibold text-foreground">
                                        {formatCurrency(price.high!, currency)}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-[13px] text-text-tertiary">
                                No units have a price set yet.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
                {property.landlord && (
                    <div className="rounded-[14px] border border-border-soft bg-card p-5 shadow-sm">
                        <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-text-tertiary uppercase">
                            <KeyRound className="size-3.5" />
                            Landlord details
                        </p>
                        <div className="text-[13px] font-semibold text-foreground">
                            {property.landlord.name}
                        </div>
                        <div className="mt-0.5 text-xs text-text-tertiary">
                            {property.landlord.email}
                        </div>
                        <Button
                            asChild
                            variant="outline"
                            className="mt-3 w-full"
                        >
                            <a href={`mailto:${property.landlord.email}`}>
                                <Mail className="size-[15px]" />
                                Contact landlord
                            </a>
                        </Button>
                    </div>
                )}

                {can('units.view') && (
                    <div className="rounded-[14px] border border-border-soft bg-card p-5 shadow-sm">
                        <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-text-tertiary uppercase">
                            <DoorOpen className="size-3.5" />
                            Units
                        </p>
                        {property.type === 'multi_unit' ? (
                            <>
                                <p className="mb-3 text-[13px] text-text-secondary">
                                    {property.units_count} unit
                                    {property.units_count === 1 ? '' : 's'} in
                                    this property.
                                </p>
                                <Button
                                    asChild
                                    variant="outline"
                                    className="w-full"
                                >
                                    <Link href={units.index(property)}>
                                        Manage units
                                        <ArrowRight className="size-[15px]" />
                                    </Link>
                                </Button>
                            </>
                        ) : property.units[0] ? (
                            <>
                                <p className="mb-3 text-[13px] text-text-secondary">
                                    Standalone properties are a single unit —
                                    manage its price, features, and photos
                                    directly.
                                </p>
                                <Button
                                    asChild
                                    variant="outline"
                                    className="w-full"
                                >
                                    <Link
                                        href={units.show([
                                            property.id,
                                            property.units[0].id,
                                        ])}
                                    >
                                        View unit
                                        <ArrowRight className="size-[15px]" />
                                    </Link>
                                </Button>
                            </>
                        ) : (
                            <p className="text-[13px] text-text-tertiary">
                                No unit record found for this property yet.
                            </p>
                        )}
                    </div>
                )}

                {property.latitude !== null && property.longitude !== null && (
                    <div className="overflow-hidden rounded-[14px] border border-border-soft bg-card shadow-sm">
                        <div className="h-full min-h-[180px]">
                            {LocationMap ? (
                                <LocationMap
                                    latitude={property.latitude}
                                    longitude={property.longitude}
                                />
                            ) : (
                                <div className="flex size-full min-h-[180px] items-center justify-center bg-secondary/50 text-xs text-text-tertiary">
                                    Loading map…
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {property.amenities.length > 0 && (
                <div className="mt-4 rounded-[14px] border border-border-soft bg-card p-5 shadow-sm">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-text-tertiary uppercase">
                        <Sparkles className="size-3.5" />
                        Amenities
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {property.amenities.map((amenity) => (
                            <Badge
                                key={amenity}
                                variant="outline"
                                className="font-normal"
                            >
                                {amenity}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}
