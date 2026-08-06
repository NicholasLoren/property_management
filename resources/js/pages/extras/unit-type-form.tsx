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
import unitTypes from '@/routes/extras/unit-types';
import { unitTypeSchema } from '@/schemas/extras';

type PageProps = {
    unitType?: { id: number; name: string; label: string };
};

export default function UnitTypeForm({ unitType }: PageProps) {
    const isEdit = Boolean(unitType);

    const { data, setField, errors, processing, submit } = useInertiaZodForm(
        unitTypeSchema,
        {
            name: unitType?.name ?? '',
            label: unitType?.label ?? '',
        },
    );

    function handleSubmit(e: FormEvent) {
        e.preventDefault();

        if (isEdit) {
            submit('put', unitTypes.update(unitType!.id).url);
        } else {
            submit('post', unitTypes.store().url);
        }
    }

    return (
        <>
            <Head title={isEdit ? 'Edit unit type' : 'Add unit type'} />

            <div className="mb-3">
                <Breadcrumbs
                    breadcrumbs={[
                        { title: 'Extras', href: extras.index('unit-types') },
                        { title: 'Unit types', href: extras.index('unit-types') },
                        {
                            title: isEdit ? 'Edit unit type' : 'Add unit type',
                            href: isEdit
                                ? unitTypes.edit(unitType!.id)
                                : unitTypes.create(),
                        },
                    ]}
                />
            </div>

            <div className="mb-[22px]">
                <h1 className="text-[21px] font-extrabold tracking-tight">
                    {isEdit ? 'Edit unit type' : 'Add unit type'}
                </h1>
                <p className="mt-1 text-[13px] text-text-secondary">
                    Shows up in the unit type picker on the unit form.
                </p>
            </div>

            <form
                onSubmit={handleSubmit}
                noValidate
                className="max-w-[480px] rounded-[14px] border border-border-soft bg-card p-5 shadow-sm"
            >
                <div className="grid gap-4">
                    <div className="grid gap-1.5">
                        <Label htmlFor="label">Label</Label>
                        <Input
                            id="label"
                            autoFocus
                            value={data.label}
                            onChange={(e) => setField('label', e.target.value)}
                            placeholder="e.g. Bedsitter"
                        />
                        <InputError message={errors.label} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="name">
                            Slug{' '}
                            <span className="font-normal text-text-tertiary">
                                (used internally, letters/numbers/- and _ only)
                            </span>
                        </Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setField('name', e.target.value)}
                            placeholder="e.g. bedsitter"
                        />
                        <InputError message={errors.name} />
                    </div>
                </div>

                <div className="mt-5 flex items-center justify-end gap-2 border-t border-border-soft pt-4">
                    <Button variant="outline" asChild>
                        <Link href={extras.index('unit-types')}>Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={processing}>
                        {processing && <Spinner />}
                        {isEdit ? 'Save changes' : 'Add unit type'}
                    </Button>
                </div>
            </form>
        </>
    );
}
