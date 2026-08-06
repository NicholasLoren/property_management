import { Head, Link } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useInertiaZodForm } from '@/hooks/use-inertia-zod-form';
import { sectionRoutes } from '@/pages/extras/section-routes';
import extras from '@/routes/extras';
import { nameOnlySchema } from '@/schemas/extras';
import type { ExtrasSection } from '@/types/extras';

type PageProps = {
    type: 'expense' | 'income' | 'document';
    typeLabel: string;
    category?: { id: number; name: string };
};

export default function CategoryForm({ type, typeLabel, category }: PageProps) {
    const isEdit = Boolean(category);
    const section = `${type}-categories` as ExtrasSection;
    const routes = sectionRoutes(section);

    const { data, setField, errors, processing, submit } = useInertiaZodForm(
        nameOnlySchema,
        { name: category?.name ?? '' },
    );

    function handleSubmit(e: FormEvent) {
        e.preventDefault();

        if (isEdit) {
            submit('put', routes.update(category!.id));
        } else {
            submit('post', routes.store());
        }
    }

    return (
        <>
            <Head title={isEdit ? `Edit ${typeLabel.toLowerCase()} category` : `Add ${typeLabel.toLowerCase()} category`} />

            <div className="mb-3">
                <Breadcrumbs
                    breadcrumbs={[
                        { title: 'Extras', href: extras.index(section) },
                        { title: `${typeLabel} categories`, href: extras.index(section) },
                        {
                            title: isEdit ? 'Edit category' : 'Add category',
                            href: isEdit ? routes.edit(category!.id) : routes.create(),
                        },
                    ]}
                />
            </div>

            <div className="mb-[22px]">
                <h1 className="text-[21px] font-extrabold tracking-tight">
                    {isEdit ? 'Edit category' : 'Add category'}
                </h1>
                <p className="mt-1 text-[13px] text-text-secondary">
                    {typeLabel} categories show up in the category picker when recording {typeLabel === 'Document' ? 'a document' : `an ${typeLabel.toLowerCase()}`}.
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
                        placeholder="e.g. Utilities"
                    />
                    <InputError message={errors.name} />
                </div>

                <div className="mt-5 flex items-center justify-end gap-2 border-t border-border-soft pt-4">
                    <Button variant="outline" asChild>
                        <Link href={extras.index(section)}>Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={processing}>
                        {processing && <Spinner />}
                        {isEdit ? 'Save changes' : 'Add category'}
                    </Button>
                </div>
            </form>
        </>
    );
}
