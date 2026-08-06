import { Head, Link } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useInertiaZodForm } from '@/hooks/use-inertia-zod-form';
import extras from '@/routes/extras';
import propertyFeatures from '@/routes/extras/property-features';
import { nameOnlySchema } from '@/schemas/extras';

type PageProps = {
    amenity?: { id: number; name: string };
};

export default function AmenityForm({ amenity }: PageProps) {
    const isEdit = Boolean(amenity);

    const { data, setField, errors, processing, submit } = useInertiaZodForm(
        nameOnlySchema,
        { name: amenity?.name ?? '' },
    );

    function handleSubmit(e: FormEvent) {
        e.preventDefault();

        if (isEdit) {
            submit('put', propertyFeatures.update(amenity!.id).url);
        } else {
            submit('post', propertyFeatures.store().url);
        }
    }

    return (
        <>
            <Head title={isEdit ? 'Edit property feature' : 'Add property feature'} />

            <div className="mb-3">
                <Breadcrumbs
                    breadcrumbs={[
                        { title: 'Extras', href: extras.index('property-features') },
                        { title: 'Property features', href: extras.index('property-features') },
                        {
                            title: isEdit ? 'Edit feature' : 'Add feature',
                            href: isEdit
                                ? propertyFeatures.edit(amenity!.id)
                                : propertyFeatures.create(),
                        },
                    ]}
                />
            </div>

            <div className="mb-[22px]">
                <h1 className="text-[21px] font-extrabold tracking-tight">
                    {isEdit ? 'Edit property feature' : 'Add property feature'}
                </h1>
                <p className="mt-1 text-[13px] text-text-secondary">
                    Shows up in the amenities checklist on the property form.
                </p>
            </div>

            <form
                onSubmit={handleSubmit}
                noValidate
                className="max-w-[480px] rounded-[14px] border border-border-soft bg-card p-5 shadow-sm"
            >
                <div className="grid gap-1.5">
                    <Label htmlFor="name">Name</Label>
                    <Input
                        id="name"
                        autoFocus
                        value={data.name}
                        onChange={(e) => setField('name', e.target.value)}
                        placeholder="e.g. Borehole"
                    />
                    <InputError message={errors.name} />
                </div>

                <div className="mt-5 flex items-center justify-end gap-2 border-t border-border-soft pt-4">
                    <Button variant="outline" asChild>
                        <Link href={extras.index('property-features')}>Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={processing}>
                        {processing && <Spinner />}
                        {isEdit ? 'Save changes' : 'Add feature'}
                    </Button>
                </div>
            </form>
        </>
    );
}
