import { Head, Link } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
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
import maintenance from '@/routes/maintenance';
import { maintenanceSchema } from '@/schemas/maintenance';
import type { MaintenancePhoto } from '@/types/maintenance';

type Option = { value: string; label: string };

type MaintenanceFormRow = {
    id: number;
    unit_id: string;
    unit_label: string | null;
    title: string;
    description: string | null;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'open' | 'in_progress' | 'completed' | 'cancelled';
    assigned_to: string | null;
    cost: string | null;
    scheduled_date: string | null;
    completed_at: string | null;
    notes: string | null;
    photos: MaintenancePhoto[];
};

type PageProps = {
    maintenanceRequest?: MaintenanceFormRow;
    units: Option[];
    assignees: Option[];
    statuses: Option[];
    priorities: Option[];
};

export default function MaintenanceForm({
    maintenanceRequest,
    units,
    assignees,
    statuses,
    priorities,
}: PageProps) {
    const isEdit = Boolean(maintenanceRequest);
    const [removedPhotoIds, setRemovedPhotoIds] = useState<number[]>([]);

    const { data, setField, errors, processing, submit } = useInertiaZodForm(
        maintenanceSchema,
        {
            unit_id: maintenanceRequest?.unit_id ?? '',
            title: maintenanceRequest?.title ?? '',
            description: maintenanceRequest?.description ?? '',
            priority: maintenanceRequest?.priority ?? 'medium',
            status: maintenanceRequest?.status ?? 'open',
            assigned_to: maintenanceRequest?.assigned_to ?? '',
            cost: maintenanceRequest?.cost ?? '',
            scheduled_date: maintenanceRequest?.scheduled_date ?? '',
            completed_at: maintenanceRequest?.completed_at ?? '',
            notes: maintenanceRequest?.notes ?? '',
            photos: [],
            remove_photo_ids: [],
        },
    );

    function handleSubmit(e: FormEvent) {
        e.preventDefault();

        if (isEdit) {
            submit('put', maintenance.update(maintenanceRequest!).url);
        } else {
            submit('post', maintenance.store().url);
        }
    }

    function removeExistingPhoto(id: number) {
        setRemovedPhotoIds((prev) => [...prev, id]);
        setField('remove_photo_ids', [...data.remove_photo_ids, id]);
    }

    const existingPhotos = (maintenanceRequest?.photos ?? []).filter(
        (photo) => !removedPhotoIds.includes(photo.id),
    );

    return (
        <>
            <Head title={isEdit ? 'Edit maintenance request' : 'Add maintenance request'} />

            <div className="mb-3">
                <Breadcrumbs
                    breadcrumbs={[
                        { title: 'Maintenance', href: maintenance.index() },
                        {
                            title: isEdit ? 'Edit request' : 'Add request',
                            href: isEdit
                                ? maintenance.edit(maintenanceRequest!)
                                : maintenance.create(),
                        },
                    ]}
                />
            </div>

            <div className="mb-[22px]">
                <h1 className="text-[21px] font-extrabold tracking-tight">
                    {isEdit ? 'Edit maintenance request' : 'Add maintenance request'}
                </h1>
                <p className="mt-1 text-[13px] text-text-secondary">
                    {isEdit
                        ? 'Update this request’s status, cost, and details.'
                        : 'Log a repair or upkeep issue for a unit.'}
                </p>
            </div>

            <form
                onSubmit={handleSubmit}
                noValidate
                className="w-full rounded-[14px] border border-border-soft bg-card p-5 shadow-sm"
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                        <Label htmlFor="unit_id">Unit</Label>
                        <SearchableSelect
                            id="unit_id"
                            value={data.unit_id || null}
                            onChange={(value) => setField('unit_id', value ?? '')}
                            options={units}
                            placeholder="Select a unit…"
                            searchPlaceholder="Search units…"
                        />
                        <InputError message={errors.unit_id} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="title">Title</Label>
                        <Input
                            id="title"
                            autoFocus
                            value={data.title}
                            onChange={(e) => setField('title', e.target.value)}
                            placeholder="e.g. Leaking kitchen tap"
                        />
                        <InputError message={errors.title} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="priority">Priority</Label>
                        <Select
                            value={data.priority}
                            onValueChange={(value) =>
                                setField('priority', value as typeof data.priority)
                            }
                        >
                            <SelectTrigger id="priority" className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {priorities.map((priority) => (
                                    <SelectItem key={priority.value} value={priority.value}>
                                        {priority.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.priority} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="status">Status</Label>
                        <Select
                            value={data.status}
                            onValueChange={(value) =>
                                setField('status', value as typeof data.status)
                            }
                        >
                            <SelectTrigger id="status" className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {statuses.map((status) => (
                                    <SelectItem key={status.value} value={status.value}>
                                        {status.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.status} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="assigned_to">
                            Assigned to{' '}
                            <span className="font-normal text-text-tertiary">
                                (optional)
                            </span>
                        </Label>
                        <SearchableSelect
                            id="assigned_to"
                            value={data.assigned_to || null}
                            onChange={(value) => setField('assigned_to', value ?? '')}
                            options={assignees}
                            placeholder="Unassigned"
                            searchPlaceholder="Search people…"
                        />
                        <InputError message={errors.assigned_to} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="cost">
                            Cost{' '}
                            <span className="font-normal text-text-tertiary">
                                (optional)
                            </span>
                        </Label>
                        <Input
                            id="cost"
                            inputMode="decimal"
                            value={data.cost ?? ''}
                            onChange={(e) => setField('cost', e.target.value)}
                            placeholder="e.g. 45000"
                        />
                        <InputError message={errors.cost} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="scheduled_date">
                            Scheduled date{' '}
                            <span className="font-normal text-text-tertiary">
                                (optional)
                            </span>
                        </Label>
                        <Input
                            id="scheduled_date"
                            type="date"
                            value={data.scheduled_date ?? ''}
                            onChange={(e) => setField('scheduled_date', e.target.value)}
                        />
                        <InputError message={errors.scheduled_date} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="completed_at">
                            Completed on{' '}
                            <span className="font-normal text-text-tertiary">
                                (optional)
                            </span>
                        </Label>
                        <Input
                            id="completed_at"
                            type="date"
                            value={data.completed_at ?? ''}
                            onChange={(e) => setField('completed_at', e.target.value)}
                        />
                        <InputError message={errors.completed_at} />
                        {data.status === 'completed' && data.cost && (
                            <p className="text-xs text-text-tertiary">
                                Marking this Completed with a cost records a matching
                                expense automatically.
                            </p>
                        )}
                    </div>
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
                        onChange={(e) => setField('description', e.target.value)}
                        placeholder="What's wrong, and where"
                        maxLength={5000}
                    />
                    <InputError message={errors.description} />
                </div>

                <div className="mt-5 border-t border-border-soft pt-4">
                    <Label htmlFor="notes" className="mb-2">
                        Notes{' '}
                        <span className="font-normal text-text-tertiary">
                            (optional)
                        </span>
                    </Label>
                    <Textarea
                        id="notes"
                        value={data.notes ?? ''}
                        onChange={(e) => setField('notes', e.target.value)}
                        placeholder="Anything else worth noting"
                        maxLength={5000}
                    />
                    <InputError message={errors.notes} />
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
                        <Link href={maintenance.index()}>Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={processing}>
                        {processing && <Spinner />}
                        {isEdit ? 'Save changes' : 'Add request'}
                    </Button>
                </div>
            </form>
        </>
    );
}
