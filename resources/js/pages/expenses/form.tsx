import { Head, Link } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { FileDropzone } from '@/components/ui/file-dropzone';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import expenses from '@/routes/expenses';
import { transactionSchema } from '@/schemas/transaction';
import type { TransactionReceipt } from '@/types/transactions';

type Option = { value: string; label: string };

type ExpenseFormRow = {
    id: number;
    property_id: string;
    category_id: string;
    amount: string;
    transaction_date: string;
    description: string | null;
    receipt: TransactionReceipt | null;
};

type PageProps = {
    expense?: ExpenseFormRow;
    properties: Option[];
    categories: Option[];
};

export default function ExpenseForm({ expense, properties, categories }: PageProps) {
    const isEdit = Boolean(expense);

    const { data, setField, errors, processing, submit } = useInertiaZodForm(
        transactionSchema,
        {
            property_id: expense?.property_id ?? '',
            category_id: expense?.category_id ?? categories[0]?.value ?? '',
            amount: expense?.amount ?? '',
            transaction_date: expense?.transaction_date ?? '',
            description: expense?.description ?? '',
            receipt: null,
            receipt_remove: false,
        },
    );

    function handleSubmit(e: FormEvent) {
        e.preventDefault();

        if (isEdit) {
            submit('put', expenses.update(expense!).url);
        } else {
            submit('post', expenses.store().url);
        }
    }

    return (
        <>
            <Head title={isEdit ? 'Edit expense' : 'Add expense'} />

            <div className="mb-3">
                <Breadcrumbs
                    breadcrumbs={[
                        { title: 'Expenses', href: expenses.index() },
                        {
                            title: isEdit ? 'Edit expense' : 'Add expense',
                            href: isEdit ? expenses.edit(expense!) : expenses.create(),
                        },
                    ]}
                />
            </div>

            <div className="mb-[22px]">
                <h1 className="text-[21px] font-extrabold tracking-tight">
                    {isEdit ? 'Edit expense' : 'Add expense'}
                </h1>
                <p className="mt-1 text-[13px] text-text-secondary">
                    Track a cost against a property — repairs, bills, taxes, and more.
                </p>
            </div>

            <form
                onSubmit={handleSubmit}
                noValidate
                className="w-full rounded-[14px] border border-border-soft bg-card p-5 shadow-sm"
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                        <Label htmlFor="property_id">Property</Label>
                        <SearchableSelect
                            id="property_id"
                            value={data.property_id || null}
                            onChange={(value) => setField('property_id', value ?? '')}
                            options={properties}
                            placeholder="Select a property…"
                            searchPlaceholder="Search properties…"
                        />
                        <InputError message={errors.property_id} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="category_id">Category</Label>
                        <Select
                            value={data.category_id}
                            onValueChange={(value) => setField('category_id', value)}
                        >
                            <SelectTrigger id="category_id" className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map((category) => (
                                    <SelectItem key={category.value} value={category.value}>
                                        {category.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.category_id} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="amount">Amount</Label>
                        <Input
                            id="amount"
                            inputMode="decimal"
                            value={data.amount}
                            onChange={(e) => setField('amount', e.target.value)}
                            placeholder="e.g. 120000"
                        />
                        <InputError message={errors.amount} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="transaction_date">Date</Label>
                        <Input
                            id="transaction_date"
                            type="date"
                            value={data.transaction_date}
                            onChange={(e) => setField('transaction_date', e.target.value)}
                        />
                        <InputError message={errors.transaction_date} />
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
                        placeholder="What this expense was for"
                        maxLength={5000}
                    />
                    <InputError message={errors.description} />
                </div>

                <div className="mt-5 border-t border-border-soft pt-4">
                    <Label className="mb-3">
                        Receipt{' '}
                        <span className="font-normal text-text-tertiary">
                            (optional)
                        </span>
                    </Label>
                    <FileDropzone
                        value={data.receipt ?? null}
                        onChange={(file) => {
                            setField('receipt', file);
                            setField('receipt_remove', false);
                        }}
                        existing={!data.receipt_remove ? (expense?.receipt ?? null) : null}
                        onRemoveExisting={() => setField('receipt_remove', true)}
                        error={errors.receipt}
                    />
                </div>

                <div className="mt-5 flex items-center justify-end gap-2 border-t border-border-soft pt-4">
                    <Button variant="outline" asChild>
                        <Link href={expenses.index()}>Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={processing}>
                        {processing && <Spinner />}
                        {isEdit ? 'Save changes' : 'Add expense'}
                    </Button>
                </div>
            </form>
        </>
    );
}
