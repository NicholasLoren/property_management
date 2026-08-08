import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Bath,
    BedDouble,
    Building2,
    Calendar,
    DoorOpen,
    KeyRound,
    Mail,
    MapPin,
    Navigation,
    Pencil,
    Percent,
    Phone,
    Sparkles,
    TrendingDown,
    TrendingUp,
    Wallet,
} from 'lucide-react';
import { useState } from 'react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EntityAvatar } from '@/components/ui/entity-avatar';
import { PhotoCarousel } from '@/components/ui/photo-carousel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

type PropertyPerformance = {
    total_income: string;
    total_expenses: string;
    net: string;
    occupancy_rate: number | null;
};

type PropertyLandlord = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    address: string | null;
    avatar?: string | null;
};

type PropertyUnit = {
    id: number;
    name: string;
    unit_type_label: string | null;
    status: string;
    status_label: string;
    current_price: { amount: string; billing_period_label: string } | null;
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
    landlord: PropertyLandlord | null;
    amenities: string[];
    photos: PropertyPhoto[];
    units_count: number;
    units: PropertyUnit[];
    quick_facts: QuickFacts;
    price_summary: PriceSummary;
    performance: PropertyPerformance;
    created_at: string | null;
};

type PageProps = { property: PropertyShowRow };

const DESCRIPTION_PREVIEW_LENGTH = 220;

const UNIT_STATUS_CLASS: Record<string, string> = {
    vacant: 'bg-warning-soft text-warning',
    occupied: 'bg-success-soft text-success',
};

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

function directionsUrl(
    latitude: number | null,
    longitude: number | null,
    address: string,
): string {
    const destination =
        latitude !== null && longitude !== null
            ? `${latitude},${longitude}`
            : address;

    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
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

export default function PropertyShow({ property }: PageProps) {
    const { currency } = usePage().props;
    const { can } = usePermissions();
    const [descriptionExpanded, setDescriptionExpanded] = useState(false);

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

            <div className="mt-4 rounded-[14px] border border-border-soft bg-card p-5 shadow-sm">
                <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-text-tertiary uppercase">
                    <MapPin className="size-3.5" />
                    Location
                </p>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[13px] text-foreground">
                        {property.address}
                    </p>
                    <Button asChild variant="outline">
                        <a
                            href={directionsUrl(
                                property.latitude,
                                property.longitude,
                                property.address,
                            )}
                            target="_blank"
                            rel="noreferrer"
                        >
                            <Navigation className="size-[15px]" />
                            Get directions
                        </a>
                    </Button>
                </div>
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

            <div className="mt-4 rounded-[14px] border border-border-soft bg-card p-5 shadow-sm">
                <Tabs defaultValue="units">
                    <TabsList>
                        <TabsTrigger value="units">
                            <DoorOpen className="size-3.5" />
                            Units
                        </TabsTrigger>
                        <TabsTrigger value="landlord">
                            <KeyRound className="size-3.5" />
                            Landlord
                        </TabsTrigger>
                        <TabsTrigger value="performance">
                            <TrendingUp className="size-3.5" />
                            Performance
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="units" className="pt-4">
                        {property.type === 'multi_unit' && (
                            <div className="mb-3 flex justify-end">
                                {can('units.view') && (
                                    <Button asChild variant="outline">
                                        <Link href={units.index(property)}>
                                            Manage units
                                            <ArrowRight className="size-[15px]" />
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        )}
                        {property.units.length > 0 ? (
                            <ul className="grid gap-2 sm:grid-cols-2">
                                {property.units.map((unit) => (
                                    <li key={unit.id}>
                                        <Link
                                            href={units.show([
                                                property.id,
                                                unit.id,
                                            ])}
                                            className="flex items-center justify-between gap-3 rounded-lg border border-border-soft px-3 py-2.5 hover:border-accent-brand"
                                        >
                                            <div>
                                                <div className="text-[13px] font-semibold text-foreground">
                                                    {unit.name}
                                                </div>
                                                <div className="text-xs text-text-tertiary">
                                                    {unit.unit_type_label ??
                                                        '—'}
                                                    {unit.current_price &&
                                                        ` · ${formatCurrency(unit.current_price.amount, currency)} / ${unit.current_price.billing_period_label.toLowerCase()}`}
                                                </div>
                                            </div>
                                            <Badge
                                                className={
                                                    UNIT_STATUS_CLASS[
                                                        unit.status
                                                    ]
                                                }
                                            >
                                                {unit.status_label}
                                            </Badge>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="rounded-lg border border-dashed border-border-soft px-3 py-6 text-center text-[13px] text-text-tertiary">
                                No units recorded for this property yet.
                            </p>
                        )}
                    </TabsContent>

                    <TabsContent value="landlord" className="pt-4">
                        {property.landlord ? (
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <EntityAvatar
                                        name={property.landlord.name}
                                        seed={property.landlord.id}
                                        imageUrl={property.landlord.avatar}
                                        className="size-12 text-base"
                                    />
                                    <div>
                                        <div className="text-[15px] font-semibold text-foreground">
                                            {property.landlord.name}
                                        </div>
                                        <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-text-secondary">
                                            <span className="inline-flex items-center gap-1.5">
                                                <Mail className="size-3.5" />
                                                {property.landlord.email}
                                            </span>
                                            {property.landlord.phone && (
                                                <span className="inline-flex items-center gap-1.5">
                                                    <Phone className="size-3.5" />
                                                    {property.landlord.phone}
                                                </span>
                                            )}
                                        </div>
                                        {property.landlord.address && (
                                            <div className="mt-0.5 text-[13px] text-text-tertiary">
                                                {property.landlord.address}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <Button asChild variant="outline">
                                    <a
                                        href={`mailto:${property.landlord.email}`}
                                    >
                                        <Mail className="size-[15px]" />
                                        Contact landlord
                                    </a>
                                </Button>
                            </div>
                        ) : (
                            <p className="rounded-lg border border-dashed border-border-soft px-3 py-6 text-center text-[13px] text-text-tertiary">
                                No landlord is assigned to this property.
                            </p>
                        )}
                    </TabsContent>

                    <TabsContent value="performance" className="pt-4">
                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-lg border border-border-soft p-3">
                                <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
                                    <TrendingUp className="size-3.5" />
                                    Total income
                                </div>
                                <div className="mt-1 text-lg font-semibold text-success">
                                    {formatCurrency(
                                        property.performance.total_income,
                                        currency,
                                    )}
                                </div>
                            </div>
                            <div className="rounded-lg border border-border-soft p-3">
                                <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
                                    <TrendingDown className="size-3.5" />
                                    Total expenses
                                </div>
                                <div className="mt-1 text-lg font-semibold text-destructive">
                                    {formatCurrency(
                                        property.performance.total_expenses,
                                        currency,
                                    )}
                                </div>
                            </div>
                            <div className="rounded-lg border border-border-soft p-3">
                                <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
                                    <Building2 className="size-3.5" />
                                    Net
                                </div>
                                <div className="mt-1 text-lg font-semibold text-foreground">
                                    {formatCurrency(
                                        property.performance.net,
                                        currency,
                                    )}
                                </div>
                            </div>
                            <div className="rounded-lg border border-border-soft p-3">
                                <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
                                    <Percent className="size-3.5" />
                                    Occupancy rate
                                </div>
                                <div className="mt-1 text-lg font-semibold text-foreground">
                                    {property.performance.occupancy_rate !==
                                    null
                                        ? `${property.performance.occupancy_rate}%`
                                        : '–'}
                                </div>
                            </div>
                            <div className="rounded-lg border border-border-soft p-3">
                                <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
                                    <DoorOpen className="size-3.5" />
                                    Vacant / Occupied
                                </div>
                                <div className="mt-1 text-lg font-semibold text-foreground">
                                    {facts.vacant} / {facts.occupied}
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
}
