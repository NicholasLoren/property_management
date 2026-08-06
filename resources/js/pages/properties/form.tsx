import { Head, Link } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import InputError from '@/components/input-error';
import { AddressMapPicker } from '@/components/ui/address-map-picker';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhotoGalleryInput } from '@/components/ui/photo-gallery-input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useInertiaZodForm } from '@/hooks/use-inertia-zod-form';
import properties from '@/routes/properties';
import { propertySchema } from '@/schemas/property';
import type { PropertyPhoto } from '@/types/properties';

type Option = { value: string; label: string };

type PropertyFormRow = {
    id: number;
    landlord_id: string;
    name: string;
    type: string;
    address: string;
    latitude: number | null;
    longitude: number | null;
    description: string | null;
    amenity_ids: number[];
    photos: PropertyPhoto[];
};

type PageProps = {
    property?: PropertyFormRow;
    landlords: Option[];
    amenities: Option[];
    types: Option[];
};

export default function PropertyForm({
    property,
    landlords,
    amenities,
    types,
}: PageProps) {
    const isEdit = Boolean(property);
    const [removedPhotoIds, setRemovedPhotoIds] = useState<number[]>([]);

    const { data, setField, errors, processing, submit } = useInertiaZodForm(
        propertySchema,
        {
            landlord_id: property?.landlord_id ?? '',
            name: property?.name ?? '',
            type: (property?.type ?? types[0]?.value ?? 'standalone') as
                'standalone' | 'multi_unit',
            address: property?.address ?? '',
            latitude: property?.latitude ?? null,
            longitude: property?.longitude ?? null,
            description: property?.description ?? '',
            amenity_ids: property?.amenity_ids ?? [],
            photos: [],
            remove_photo_ids: [],
        },
    );

    function handleSubmit(e: FormEvent) {
        e.preventDefault();

        if (isEdit) {
            submit('put', properties.update(property!).url);
        } else {
            submit('post', properties.store().url);
        }
    }

    function toggleAmenity(id: number, checked: boolean) {
        setField(
            'amenity_ids',
            checked
                ? [...data.amenity_ids, id]
                : data.amenity_ids.filter((a) => a !== id),
        );
    }

    function removeExistingPhoto(id: number) {
        setRemovedPhotoIds((prev) => [...prev, id]);
        setField('remove_photo_ids', [...data.remove_photo_ids, id]);
    }

    const existingPhotos = (property?.photos ?? []).filter(
        (photo) => !removedPhotoIds.includes(photo.id),
    );

    return (
        <>
            <Head title={isEdit ? 'Edit property' : 'Add property'} />

            <div className="mb-3">
                <Breadcrumbs
                    breadcrumbs={[
                        { title: 'Properties', href: properties.index() },
                        {
                            title: isEdit ? 'Edit property' : 'Add property',
                            href: isEdit
                                ? properties.edit(property!)
                                : properties.create(),
                        },
                    ]}
                />
            </div>

            <div className="mb-[22px]">
                <h1 className="text-[21px] font-extrabold tracking-tight">
                    {isEdit ? 'Edit property' : 'Add property'}
                </h1>
                <p className="mt-1 text-[13px] text-text-secondary">
                    {isEdit
                        ? 'Update this property’s details, amenities, and photos.'
                        : 'Register a new building or house under a landlord.'}
                </p>
            </div>

            <form
                onSubmit={handleSubmit}
                noValidate
                className="w-full rounded-[14px] border border-border-soft bg-card p-5 shadow-sm"
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                        <Label htmlFor="landlord_id">Landlord</Label>
                        <SearchableSelect
                            id="landlord_id"
                            value={data.landlord_id}
                            onChange={(value) =>
                                setField('landlord_id', value ?? '')
                            }
                            options={landlords}
                            placeholder="Select a landlord…"
                            searchPlaceholder="Search landlords…"
                        />
                        <InputError message={errors.landlord_id} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="type">Type</Label>
                        <Select
                            value={data.type}
                            onValueChange={(value) =>
                                setField(
                                    'type',
                                    value as 'standalone' | 'multi_unit',
                                )
                            }
                        >
                            <SelectTrigger id="type" className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {types.map((type) => (
                                    <SelectItem
                                        key={type.value}
                                        value={type.value}
                                    >
                                        {type.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.type} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            autoFocus
                            value={data.name}
                            onChange={(e) => setField('name', e.target.value)}
                            placeholder="e.g. Kisementi Apartments"
                        />
                        <InputError message={errors.name} />
                    </div>
                </div>

                <div className="mt-5 border-t border-border-soft pt-4">
                    <Label htmlFor="address" className="mb-2">
                        Address
                    </Label>
                    <AddressMapPicker
                        address={data.address}
                        onAddressChange={(value) => setField('address', value)}
                        latitude={data.latitude ?? null}
                        longitude={data.longitude ?? null}
                        onLocationChange={(latitude, longitude) => {
                            setField('latitude', latitude);
                            setField('longitude', longitude);
                        }}
                        error={errors.address}
                    />
                </div>

                <div className="mt-5 border-t border-border-soft pt-4">
                    <Label htmlFor="description" className="mb-2">
                        Description{' '}
                        <span className="font-normal text-text-tertiary">
                            (optional)
                        </span>
                    </Label>
                    <Textarea
                        id="description"
                        value={data.description ?? ''}
                        onChange={(e) =>
                            setField('description', e.target.value)
                        }
                        placeholder="Anything else worth noting about this property"
                        maxLength={5000}
                    />
                    <InputError message={errors.description} />
                </div>

                <div className="mt-5 border-t border-border-soft pt-4">
                    <Label className="mb-3">Amenities</Label>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {amenities.map((amenity) => (
                            <label
                                key={amenity.value}
                                className="flex items-center gap-2 text-sm"
                            >
                                <Checkbox
                                    checked={data.amenity_ids.includes(
                                        Number(amenity.value),
                                    )}
                                    onCheckedChange={(checked) =>
                                        toggleAmenity(
                                            Number(amenity.value),
                                            checked === true,
                                        )
                                    }
                                />
                                {amenity.label}
                            </label>
                        ))}
                    </div>
                    <InputError message={errors.amenity_ids} />
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
                        <Link href={properties.index()}>Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={processing}>
                        {processing && <Spinner />}
                        {isEdit ? 'Save changes' : 'Add property'}
                    </Button>
                </div>
            </form>
        </>
    );
}
