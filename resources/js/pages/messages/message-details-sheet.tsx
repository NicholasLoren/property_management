import { Link, usePage } from '@inertiajs/react';
import { CheckCheck, Mail, Megaphone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { avatarTone, badgeToneClass } from '@/lib/avatar-tone';
import { formatDateTime } from '@/lib/datetime';
import messages from '@/routes/messages';

export type MessageDetails = {
    id: number;
    type: 'personal' | 'broadcast';
    type_label: string;
    subject: string;
    body: string;
    sender_name: string;
    created_at: string | null;
    is_sender: boolean;
    recipients: { name: string; read_at: string | null }[] | null;
};

export function MessageDetailsSheet({
    message,
    onOpenChange,
}: {
    message: MessageDetails | null;
    onOpenChange: (open: boolean) => void;
}) {
    const { timezone } = usePage().props;

    return (
        <Sheet open={message !== null} onOpenChange={onOpenChange}>
            <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
                {message && (
                    <>
                        <SheetHeader className="border-b border-border-soft">
                            <SheetTitle className="text-[15px]">
                                {message.subject}
                            </SheetTitle>
                            <SheetDescription>
                                {message.is_sender
                                    ? 'From you'
                                    : `From ${message.sender_name}`}{' '}
                                · {formatDateTime(message.created_at, timezone)}
                            </SheetDescription>
                        </SheetHeader>

                        <div className="flex flex-col gap-5 p-4">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                    className={
                                        badgeToneClass[avatarTone(message.type)]
                                    }
                                >
                                    {message.type === 'broadcast' ? (
                                        <Megaphone className="size-3" />
                                    ) : (
                                        <Mail className="size-3" />
                                    )}
                                    {message.type_label}
                                </Badge>
                            </div>

                            <p className="text-[13px] leading-relaxed whitespace-pre-line text-foreground">
                                {message.body}
                            </p>

                            {message.is_sender && message.recipients && (
                                <div className="border-t border-border-soft pt-4">
                                    <p className="mb-2.5 text-xs font-semibold tracking-wide text-text-tertiary uppercase">
                                        Recipients ({message.recipients.length})
                                    </p>
                                    <div className="grid max-h-80 gap-2.5 overflow-y-auto">
                                        {message.recipients.map(
                                            (recipient, index) => (
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
                                                            Read{' '}
                                                            {formatDateTime(
                                                                recipient.read_at,
                                                                timezone,
                                                            )}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-text-tertiary">
                                                            Unread
                                                        </span>
                                                    )}
                                                </div>
                                            ),
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="border-t border-border-soft pt-4">
                                <Link
                                    href={messages.show(message)}
                                    className="text-xs font-medium text-accent-brand hover:opacity-80"
                                >
                                    Open full page
                                </Link>
                            </div>
                        </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}
