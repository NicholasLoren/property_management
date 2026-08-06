import { Head, Link } from '@inertiajs/react';
import { Megaphone, Send } from 'lucide-react';
import type { FormEvent } from 'react';
import { useMemo } from 'react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
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
import { cn } from '@/lib/utils';
import messages from '@/routes/messages';
import { messageSchema } from '@/schemas/message';

type RecipientUser = { id: number; name: string; email: string };

type PageProps = {
    users: RecipientUser[];
    roles: string[];
    canBroadcast: boolean;
};

export default function MessageForm({ users, roles, canBroadcast }: PageProps) {
    const userOptions = useMemo(
        () =>
            users.map((user) => ({
                value: String(user.id),
                label: user.name,
                description: user.email,
            })),
        [users],
    );

    const { data, setField, errors, processing, submit } = useInertiaZodForm(
        messageSchema,
        {
            type: 'personal',
            subject: '',
            body: '',
            recipient_user_id: null,
            recipient_scope: null,
            recipient_role: null,
        },
    );

    function switchType(type: 'personal' | 'broadcast') {
        setField('type', type);
        setField('recipient_user_id', null);
        setField('recipient_scope', null);
        setField('recipient_role', null);
    }

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        submit('post', messages.store().url);
    }

    return (
        <>
            <Head title="New message" />

            <div className="mb-3">
                <Breadcrumbs
                    breadcrumbs={[
                        { title: 'Messages', href: messages.index() },
                        { title: 'New message', href: messages.create() },
                    ]}
                />
            </div>

            <div className="mb-[22px]">
                <h1 className="text-[21px] font-extrabold tracking-tight">
                    New message
                </h1>
                <p className="mt-1 text-[13px] text-text-secondary">
                    Send a personal message to a user, or broadcast to everyone
                    or a whole role.
                </p>
            </div>

            <form
                onSubmit={handleSubmit}
                noValidate
                className="w-full rounded-[14px] border border-border-soft bg-card p-5 shadow-sm"
            >
                <div className="grid gap-4">
                    <div className="grid gap-1.5">
                        <Label>Type</Label>
                        <div className="inline-flex w-fit gap-0.5 rounded-full border border-border-soft bg-secondary p-[3px]">
                            <button
                                type="button"
                                onClick={() => switchType('personal')}
                                className={cn(
                                    'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold',
                                    data.type === 'personal'
                                        ? 'bg-card text-foreground shadow-sm'
                                        : 'text-text-secondary',
                                )}
                            >
                                <Send className="size-3.5" />
                                Personal
                            </button>
                            {canBroadcast && (
                                <button
                                    type="button"
                                    onClick={() => switchType('broadcast')}
                                    className={cn(
                                        'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold',
                                        data.type === 'broadcast'
                                            ? 'bg-card text-foreground shadow-sm'
                                            : 'text-text-secondary',
                                    )}
                                >
                                    <Megaphone className="size-3.5" />
                                    Broadcast
                                </button>
                            )}
                        </div>
                    </div>

                    {data.type === 'personal' ? (
                        <div className="grid gap-1.5">
                            <Label htmlFor="recipient_user_id">To</Label>
                            <SearchableSelect
                                id="recipient_user_id"
                                value={
                                    data.recipient_user_id
                                        ? String(data.recipient_user_id)
                                        : null
                                }
                                onChange={(value) =>
                                    setField(
                                        'recipient_user_id',
                                        value ? Number(value) : null,
                                    )
                                }
                                options={userOptions}
                                placeholder="Choose a user"
                                searchPlaceholder="Search users…"
                                emptyMessage="No users found."
                            />
                            <InputError message={errors.recipient_user_id} />
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-1.5">
                                <Label htmlFor="recipient_scope">
                                    Audience
                                </Label>
                                <Select
                                    value={data.recipient_scope ?? undefined}
                                    onValueChange={(value) => {
                                        setField(
                                            'recipient_scope',
                                            value as 'all' | 'role',
                                        );

                                        if (value === 'all') {
                                            setField('recipient_role', null);
                                        }
                                    }}
                                >
                                    <SelectTrigger
                                        id="recipient_scope"
                                        className="w-full"
                                    >
                                        <SelectValue placeholder="Choose audience" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All users
                                        </SelectItem>
                                        <SelectItem value="role">
                                            Users with a role
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.recipient_scope} />
                            </div>

                            {data.recipient_scope === 'role' && (
                                <div className="grid gap-1.5">
                                    <Label htmlFor="recipient_role">Role</Label>
                                    <Select
                                        value={data.recipient_role ?? undefined}
                                        onValueChange={(value) =>
                                            setField('recipient_role', value)
                                        }
                                    >
                                        <SelectTrigger
                                            id="recipient_role"
                                            className="w-full"
                                        >
                                            <SelectValue placeholder="Choose a role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {roles.map((role) => (
                                                <SelectItem
                                                    key={role}
                                                    value={role}
                                                >
                                                    {role}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError
                                        message={errors.recipient_role}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    <div className="grid gap-1.5">
                        <Label htmlFor="subject">Subject</Label>
                        <Input
                            id="subject"
                            value={data.subject}
                            onChange={(e) =>
                                setField('subject', e.target.value)
                            }
                            maxLength={255}
                            placeholder="What's this about?"
                        />
                        <InputError message={errors.subject} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="body">Message</Label>
                        <Textarea
                            id="body"
                            rows={8}
                            value={data.body}
                            onChange={(e) => setField('body', e.target.value)}
                            maxLength={5000}
                            placeholder="Write your message…"
                        />
                        <InputError message={errors.body} />
                    </div>
                </div>

                <div className="mt-5 flex items-center justify-end gap-2 border-t border-border-soft pt-4">
                    <Button variant="outline" asChild>
                        <Link href={messages.index()}>Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={processing}>
                        {processing && <Spinner />}
                        {data.type === 'broadcast'
                            ? 'Send broadcast'
                            : 'Send message'}
                    </Button>
                </div>
            </form>
        </>
    );
}
