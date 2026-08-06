import { usePage } from '@inertiajs/react';
import { Laptop, MapPin } from 'lucide-react';
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
import type { LogRow } from '@/pages/logs/columns';

function formatKey(key: string): string {
    return key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatValue(value: unknown): string {
    if (value === null || value === undefined || value === '') {
        return '—';
    }

    if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
    }

    if (typeof value === 'object') {
        return JSON.stringify(value);
    }

    return String(value);
}

export function LogDetailsSheet({
    log,
    onOpenChange,
}: {
    log: LogRow | null;
    onOpenChange: (open: boolean) => void;
}) {
    const { timezone } = usePage().props;
    const attributes =
        (log?.properties.attributes as Record<string, unknown> | undefined) ??
        null;
    const old =
        (log?.properties.old as Record<string, unknown> | undefined) ?? null;
    const custom = log
        ? Object.fromEntries(
              Object.entries(log.properties).filter(
                  ([key]) => key !== 'attributes' && key !== 'old',
              ),
          )
        : {};
    const hasDetails = Boolean(attributes) || Object.keys(custom).length > 0;

    return (
        <Sheet open={log !== null} onOpenChange={onOpenChange}>
            <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
                {log && (
                    <>
                        <SheetHeader className="border-b border-border-soft">
                            <SheetTitle className="text-[15px]">
                                {log.description}
                            </SheetTitle>
                            <SheetDescription>
                                {formatDateTime(log.created_at, timezone)}
                            </SheetDescription>
                        </SheetHeader>

                        <div className="flex flex-col gap-5 p-4">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                    className={
                                        badgeToneClass[avatarTone(log.log_name)]
                                    }
                                >
                                    {log.log_name}
                                </Badge>
                                {log.subject_type && (
                                    <Badge
                                        variant="outline"
                                        className="font-normal"
                                    >
                                        {log.subject_type}
                                    </Badge>
                                )}
                                <span className="text-[13px] text-text-secondary">
                                    by {log.causer_name ?? 'System'}
                                </span>
                            </div>

                            <div className="grid gap-1.5 text-xs text-text-tertiary">
                                <span className="inline-flex items-center gap-1.5">
                                    <Laptop className="size-3.5 shrink-0" />
                                    {[log.browser, log.platform, log.device]
                                        .filter(Boolean)
                                        .join(' · ') || 'Unknown device'}
                                </span>
                                <span className="inline-flex items-center gap-1.5 font-mono">
                                    <MapPin className="size-3.5 shrink-0" />
                                    {log.ip ?? 'Unknown IP'}
                                </span>
                            </div>

                            {hasDetails && (
                                <div className="border-t border-border-soft pt-4">
                                    <p className="mb-2.5 text-xs font-semibold tracking-wide text-text-tertiary uppercase">
                                        Details
                                    </p>
                                    <dl className="grid gap-3">
                                        {attributes &&
                                            Object.entries(attributes).map(
                                                ([key, value]) => (
                                                    <div key={key}>
                                                        <dt className="text-xs text-text-tertiary">
                                                            {formatKey(key)}
                                                        </dt>
                                                        <dd className="mt-0.5 text-[13px] whitespace-pre-line text-foreground">
                                                            {old &&
                                                            key in old ? (
                                                                <>
                                                                    <span className="text-text-tertiary line-through">
                                                                        {formatValue(
                                                                            old[
                                                                                key
                                                                            ],
                                                                        )}
                                                                    </span>
                                                                    {' → '}
                                                                    <span>
                                                                        {formatValue(
                                                                            value,
                                                                        )}
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                formatValue(
                                                                    value,
                                                                )
                                                            )}
                                                        </dd>
                                                    </div>
                                                ),
                                            )}
                                        {Object.entries(custom).map(
                                            ([key, value]) => (
                                                <div key={key}>
                                                    <dt className="text-xs text-text-tertiary">
                                                        {formatKey(key)}
                                                    </dt>
                                                    <dd className="mt-0.5 text-[13px] text-foreground">
                                                        {formatValue(value)}
                                                    </dd>
                                                </div>
                                            ),
                                        )}
                                    </dl>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}
