import { Head, Link, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhotoGalleryInput } from '@/components/ui/photo-gallery-input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { useInertiaZodForm } from '@/hooks/use-inertia-zod-form';
import properties from '@/routes/properties';
import units from '@/routes/units';
import { unitSchema } from '@/schemas/unit';
import type { UnitPhoto } from '@/types/units';

type Option = { value: string; label: string };
type FeatureOption = { value: number; label: string };

type PropertyContext = { id: number; name: string };

type UnitFormRow = {
    id: number;
    unit_type_id: string | null;
    name: string;
    size: string | null;
    status: string;
    price_amount: string | null;
    price_billing_period: string | null;
    features: { unit_feature_id: number; quantity: number }[];
    photos: UnitPhoto[];
};

type PageProps = {
    property: PropertyContext;
    unit?: UnitFormRow;
    unitTypes: Option[];
    features: FeatureOption[];
    statuses: Option[];
    billingPeriods: Option[];
};

export default function UnitForm({
    property,
    unit,
    unitTypes,
    features,
    statuses,
    billingPeriods,
}: PageProps) {
    const { currency } = usePage().props;
    const isEdit = Boolean(unit);
    const [removedPhotoIds, setRemovedPhotoIds] = useState<number[]>([]);

    const { data, setField, errors, processing, submit } = useInertiaZodForm(
        unitSchema,
        {
            unit_type_id: unit?.unit_type_id ?? null,
            name: unit?.name ?? '',
            size: unit?.size ?? '',
            status: (unit?.status ?? statuses[0]?.value ?? 'vacant') as
                'vacant' | 'occupied',
            price_amount: unit?.price_amount ?? '',
            price_billing_period: (unit?.price_billing_period ??
                billingPeriods[0]?.value ??
                'monthly') as 'monthly' | 'quarterly' | 'yearly',
            features: unit?.features ?? [],
            photos: [],
            remove_photo_ids: [],
        },
    );

    function handleSubmit(e: FormEvent) {
        e.preventDefault();

        if (isEdit) {
            submit('put', units.update([property.id, unit!.id]).url);
        } else {
            submit('post', units.store(property).url);
        }
    }

    function isFeatureSelected(id: number) {
        return data.features.some((f) => f.unit_feature_id === id);
    }

    function featureQuantity(id: number): number {
        return (
            data.features.find((f) => f.unit_feature_id === id)?.quantity ?? 1
        );
    }

    function toggleFeature(id: number, checked: boolean) {
        setField(
            'features',
            checked
                ? [...data.features, { unit_feature_id: id, quantity: 1 }]
                : data.features.filter((f) => f.unit_feature_id !== id),
        );
    }

    function setFeatureQuantity(id: number, quantity: number) {
        setField(
            'features',
            data.features.map((f) =>
                f.unit_feature_id === id
                    ? { ...f, quantity: Math.max(1, quantity) }
                    : f,
            ),
        );
    }

    function removeExistingPhoto(id: number) {
        setRemovedPhotoIds((prev) => [...prev, id]);
        setField('remove_photo_ids', [...data.remove_photo_ids, id]);
    }

    const existingPhotos = (unit?.photos ?? []).filter(
        (photo) => !removedPhotoIds.includes(photo.id),
    );

    return (
        <>
            <Head title={isEdit ? 'Edit unit' : 'Add unit'} />

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
                            title: isEdit ? 'Edit unit' : 'Add unit',
                            href: isEdit
                                ? units.edit([property.id, unit!.id])
                                : units.create(property),
                        },
                    ]}
                />
            </div>

            <div className="mb-[22px]">
                <h1 className="text-[21px] font-extrabold tracking-tight">
                    {isEdit ? 'Edit unit' : 'Add unit'}
                </h1>
                <p className="mt-1 text-[13px] text-text-secondary">
                    {isEdit
                        ? 'Update this unit’s details, pricing, and features.'
                        : `Register a new rentable unit within ${property.name}.`}
                </p>
            </div>

            <form
                onSubmit={handleSubmit}
                noValidate
                className="w-full rounded-[14px] border border-border-soft bg-card p-5 shadow-sm"
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            autoFocus
                            value={data.name}
                            onChange={(e) => setField('name', e.target.value)}
                            placeholder="e.g. Unit 2B"
                        />
                        <InputError message={errors.name} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="unit_type_id">
                            Unit type{' '}
                            <span className="font-normal text-text-tertiary">
                                (optional)
                            </span>
                        </Label>
                        <Select
                            value={data.unit_type_id ?? undefined}
                            onValueChange={(value) =>
                                setField('unit_type_id', value)
                            }
                        >
                            <SelectTrigger id="unit_type_id" className="w-full">
                                <SelectValue placeholder="Select a type…" />
                            </SelectTrigger>
                            <SelectContent>
                                {unitTypes.map((type) => (
                                    <SelectItem
                                        key={type.value}
                                        value={type.value}
                                    >
                                        {type.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.unit_type_id} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="size">
                            Size{' '}
                            <span className="font-normal text-text-tertiary">
                                (optional)
                            </span>
                        </Label>
                        <Input
                            id="size"
                            value={data.size ?? ''}
                            onChange={(e) => setField('size', e.target.value)}
                            placeholder="e.g. 45 sqm"
                        />
                        <InputError message={errors.size} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="status">Status</Label>
                        <Select
                            value={data.status}
                            onValueChange={(value) =>
                                setField(
                                    'status',
                                    value as 'vacant' | 'occupied',
                                )
                            }
                        >
                            <SelectTrigger id="status" className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {statuses.map((status) => (
                                    <SelectItem
                                        key={status.value}
                                        value={status.value}
                                    >
                                        {status.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.status} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="price_amount">
                            Price ({currency})
                        </Label>
                        <Input
                            id="price_amount"
                            inputMode="decimal"
                            value={data.price_amount}
                            onChange={(e) =>
                                setField('price_amount', e.target.value)
                            }
                            placeholder="e.g. 500000"
                        />
                        <InputError message={errors.price_amount} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="price_billing_period">
                            Billing period
                        </Label>
                        <Select
                            value={data.price_billing_period}
                            onValueChange={(value) =>
                                setField(
                                    'price_billing_period',
                                    value as 'monthly' | 'quarterly' | 'yearly',
                                )
                            }
                        >
                            <SelectTrigger
                                id="price_billing_period"
                                className="w-full"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {billingPeriods.map((period) => (
                                    <SelectItem
                                        key={period.value}
                                        value={period.value}
                                    >
                                        {period.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.price_billing_period} />
                    </div>
                </div>

                <div className="mt-5 border-t border-border-soft pt-4">
                    <Label className="mb-3">Features</Label>
                    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                        {features.map((feature) => {
                            const selected = isFeatureSelected(feature.value);

                            return (
                                <div
                                    key={feature.value}
                                    className="flex items-center gap-2.5"
                                >
                                    <label className="flex flex-1 items-center gap-2 text-sm">
                                        <Checkbox
                                            checked={selected}
                                            onCheckedChange={(checked) =>
                                                toggleFeature(
                                                    feature.value,
                                                    checked === true,
                                                )
                                            }
                                        />
                                        {feature.label}
                                    </label>
                                    {selected && (
                                        <Input
                                            type="number"
                                            min={1}
                                            value={featureQuantity(
                                                feature.value,
                                            )}
                                            onChange={(e) =>
                                                setFeatureQuantity(
                                                    feature.value,
                                                    Number(e.target.value),
                                                )
                                            }
                                            className="w-16"
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <InputError message={errors.features} />
                </div>

                <div className="mt-5 border-t border-border-soft pt-4">
                    <Label className="mb-3">Photos</Label>
                    <PhotoGalleryInput
                        existing={existingPhotos}
                        onRemoveExisting={removeExistingPhoto}
                        files={data.photos}
                        onChange={(files) => setField('photos', files)}
                        error={errors.photos}
                    />
                </div>

                <div className="mt-5 flex items-center justify-end gap-2 border-t border-border-soft pt-4">
                    <Button variant="outline" asChild>
                        <Link href={units.index(property)}>Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={processing}>
                        {processing && <Spinner />}
                        {isEdit ? 'Save changes' : 'Add unit'}
                    </Button>
                </div>
            </form>
        </>
    );
}
