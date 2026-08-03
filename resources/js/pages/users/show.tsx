import { Head, Link, usePage } from '@inertiajs/react';
import {
    FileText,
    IdCard,
    MapPin,
    Pencil,
    ShieldCheck,
    StickyNote,
} from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useInitials } from '@/hooks/use-initials';
import { avatarTone, avatarToneClass, badgeToneClass } from '@/lib/avatar-tone';
import users from '@/routes/users';

type UserShowRow = {
    id: number;
    name: string;
    email: string;
    role: string | null;
    permissions: string[];
    status: string;
    status_label: string;
    last_active_at: string | null;
    created_at: string | null;
    landlord: {
        id_number: string | null;
        address: string | null;
        notes: string | null;
        document: { name: string; url: string } | null;
    } | null;
};

type PageProps = { user: UserShowRow };

const STATUS_DOT_CLASS: Record<string, string> = {
    active: 'bg-success',
    invited: 'bg-warning',
    suspended: 'bg-text-tertiary',
};

function formatDateTime(iso: string | null): string {
    if (!iso) {
        return 'Never';
    }

    return new Date(iso).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}

function formatDate(iso: string | null): string {
    if (!iso) {
        return '–';
    }

    return new Date(iso).toLocaleDateString(undefined, {
        dateStyle: 'medium',
    });
}

export default function UserShow({ user }: PageProps) {
    const { auth } = usePage().props;
    const getInitials = useInitials();

    return (
        <>
            <Head title={user.name} />

            <div className="mb-3">
                <Breadcrumbs
                    breadcrumbs={[
                        { title: 'Users', href: users.index() },
                        { title: user.name, href: users.show(user) },
                    ]}
                />
            </div>

            <div className="mb-[22px] flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <span
                        className={`flex size-12 shrink-0 items-center justify-center rounded-full font-display text-base font-bold text-accent-contrast ${avatarToneClass[avatarTone(user.id)]}`}
                    >
                        {getInitials(user.name)}
                    </span>
                    <div>
                        <h1 className="text-[21px] font-extrabold tracking-tight">
                            {user.name}
                        </h1>
                        <p className="mt-0.5 text-[13px] text-text-secondary">
                            {user.email}
                        </p>
                    </div>
                </div>
                {auth.can.users.edit && (
                    <Button asChild variant="outline">
                        <Link href={users.edit(user)}>
                            <Pencil className="size-[15px]" />
                            Edit
                        </Link>
                    </Button>
                )}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-[14px] border border-border-soft bg-card p-5 shadow-sm lg:col-span-2">
                    <p className="mb-3 text-xs font-semibold tracking-wide text-text-tertiary uppercase">
                        Profile
                    </p>
                    <dl className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <dt className="text-xs text-text-tertiary">Role</dt>
                            <dd className="mt-1">
                                {user.role ? (
                                    <Badge
                                        className={
                                            badgeToneClass[
                                                avatarTone(user.role)
                                            ]
                                        }
                                    >
                                        {user.role}
                                    </Badge>
                                ) : (
                                    <span className="text-sm text-text-secondary">
                                        No role
                                    </span>
                                )}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs text-text-tertiary">
                                Status
                            </dt>
                            <dd className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-text-secondary">
                                <span
                                    className={`size-[7px] rounded-full ${STATUS_DOT_CLASS[user.status]}`}
                                />
                                {user.status_label}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs text-text-tertiary">
                                Last active
                            </dt>
                            <dd className="mt-1 text-[13px] text-text-secondary">
                                {formatDateTime(user.last_active_at)}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs text-text-tertiary">
                                Joined
                            </dt>
                            <dd className="mt-1 text-[13px] text-text-secondary">
                                {formatDate(user.created_at)}
                            </dd>
                        </div>
                    </dl>

                    {user.permissions.length > 0 && (
                        <div className="mt-5 border-t border-border-soft pt-4">
                            <p className="mb-2 flex items-center gap-1.5 text-xs text-text-tertiary">
                                <ShieldCheck className="size-3.5" />
                                Permissions granted via {user.role}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {user.permissions.map((permission) => (
                                    <Badge
                                        key={permission}
                                        variant="outline"
                                        className="font-normal"
                                    >
                                        {permission}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {user.landlord && (
                    <div className="rounded-[14px] border border-border-soft bg-card p-5 shadow-sm">
                        <p className="mb-3 text-xs font-semibold tracking-wide text-text-tertiary uppercase">
                            Landlord details
                        </p>
                        <div className="grid gap-3">
                            {user.landlord.id_number && (
                                <div className="flex items-start gap-2">
                                    <IdCard className="mt-0.5 size-4 shrink-0 text-text-tertiary" />
                                    <div>
                                        <div className="text-xs text-text-tertiary">
                                            ID / registration number
                                        </div>
                                        <div className="text-[13px] text-foreground">
                                            {user.landlord.id_number}
                                        </div>
                                    </div>
                                </div>
                            )}
                            {user.landlord.address && (
                                <div className="flex items-start gap-2">
                                    <MapPin className="mt-0.5 size-4 shrink-0 text-text-tertiary" />
                                    <div>
                                        <div className="text-xs text-text-tertiary">
                                            Address
                                        </div>
                                        <div className="text-[13px] text-foreground">
                                            {user.landlord.address}
                                        </div>
                                    </div>
                                </div>
                            )}
                            {user.landlord.notes && (
                                <div className="flex items-start gap-2">
                                    <StickyNote className="mt-0.5 size-4 shrink-0 text-text-tertiary" />
                                    <div>
                                        <div className="text-xs text-text-tertiary">
                                            Notes
                                        </div>
                                        <div className="text-[13px] whitespace-pre-line text-foreground">
                                            {user.landlord.notes}
                                        </div>
                                    </div>
                                </div>
                            )}
                            {user.landlord.document && (
                                <div className="flex items-start gap-2">
                                    <FileText className="mt-0.5 size-4 shrink-0 text-text-tertiary" />
                                    <div>
                                        <div className="text-xs text-text-tertiary">
                                            Document
                                        </div>
                                        <a
                                            href={user.landlord.document.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-[13px] text-accent-strong hover:underline"
                                        >
                                            {user.landlord.document.name}
                                        </a>
                                    </div>
                                </div>
                            )}
                            {!user.landlord.id_number &&
                                !user.landlord.address &&
                                !user.landlord.notes &&
                                !user.landlord.document && (
                                    <p className="text-[13px] text-text-tertiary">
                                        No landlord details on file yet.
                                    </p>
                                )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
