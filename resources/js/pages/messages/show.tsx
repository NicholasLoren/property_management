import { Head } from '@inertiajs/react';
import { CheckCheck, Mail, Megaphone, Send } from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import messages from '@/routes/messages';

type Recipient = { name: string; read_at: string | null };

type MessageShowRow = {
    id: number;
    type: 'personal' | 'broadcast';
    type_label: string;
    subject: string;
    body: string;
    sender_name: string;
    created_at: string | null;
    is_sender: boolean;
    recipients: Recipient[] | null;
};

type PageProps = { message: MessageShowRow };

function formatDateTime(iso: string | null): string {
    if (!iso) {
        return '–';
    }

    return new Date(iso).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}

export default function MessageShow({ message }: PageProps) {
    return (
        <>
            <Head title={message.subject} />

            <div className="mb-3">
                <Breadcrumbs
                    breadcrumbs={[
                        { title: 'Messages', href: messages.index() },
                        {
                            title: message.subject,
                            href: messages.show(message),
                        },
                    ]}
                />
            </div>

            <div className="mb-[22px] flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-secondary text-text-secondary">
                        {message.type === 'broadcast' ? (
                            <Megaphone className="size-5" />
                        ) : (
                            <Mail className="size-5" />
                        )}
                    </span>
                    <div>
                        <h1 className="text-[21px] font-extrabold tracking-tight">
                            {message.subject}
                        </h1>
                        <p className="mt-0.5 text-[13px] text-text-secondary">
                            {message.is_sender
                                ? 'From you'
                                : `From ${message.sender_name}`}{' '}
                            · {formatDateTime(message.created_at)}
                        </p>
                    </div>
                </div>
                <Badge variant="outline" className="gap-1 font-normal">
                    {message.type === 'broadcast' ? (
                        <Megaphone className="size-3" />
                    ) : (
                        <Send className="size-3" />
                    )}
                    {message.type_label}
                </Badge>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-[14px] border border-border-soft bg-card p-5 shadow-sm lg:col-span-2">
                    <p className="text-[13px] leading-relaxed whitespace-pre-line text-foreground">
                        {message.body}
                    </p>
                </div>

                {message.is_sender && message.recipients && (
                    <div className="rounded-[14px] border border-border-soft bg-card p-5 shadow-sm">
                        <p className="mb-3 text-xs font-semibold tracking-wide text-text-tertiary uppercase">
                            Recipients ({message.recipients.length})
                        </p>
                        <div className="grid max-h-80 gap-2.5 overflow-y-auto">
                            {message.recipients.map((recipient, index) => (
                                <div
                                    key={`${recipient.name}-${index}`}
                                    className="flex items-center justify-between gap-2 text-[13px]"
                                >
                                    <span className="text-foreground">
                                        {recipient.name}
                                    </span>
                                    {recipient.read_at ? (
                                        <span className="inline-flex items-center gap-1 text-xs text-success">
                                            <CheckCheck className="size-3.5" />
                                            Read
                                        </span>
                                    ) : (
                                        <span className="text-xs text-text-tertiary">
                                            Unread
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
