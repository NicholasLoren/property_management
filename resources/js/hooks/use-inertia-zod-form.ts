import type { FormDataConvertible } from '@inertiajs/core';
import { hasFiles } from '@inertiajs/core';
import { router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import type { z } from 'zod';

type Method = 'post' | 'patch' | 'put';

/**
 * Recursively sums File/Blob sizes anywhere in the payload (mirrors the
 * traversal `hasFiles` does), so a form with several file fields — or one
 * array field of files, like a photo gallery — can be checked as a whole
 * against the server's request-size ceiling before it's ever sent.
 */
function sumFileSizes(data: unknown): number {
    if (data instanceof Blob) {
        return data.size;
    }

    if (Array.isArray(data)) {
        return data.reduce((total, value) => total + sumFileSizes(value), 0);
    }

    if (typeof data === 'object' && data !== null) {
        return Object.values(data).reduce(
            (total: number, value) => total + sumFileSizes(value),
            0,
        );
    }

    return 0;
}

/**
 * Brings the first invalid field into view and focuses it, so a long form
 * doesn't leave the user hunting for what failed. Matches on the `id`
 * attribute against the error key — the app's forms consistently set
 * `id="<field>"` to match the schema key (see any `form.tsx`), so this
 * works without every field needing extra wiring. Falls back to the error
 * key's first path segment (e.g. `features.0.quantity` -> `features`) for
 * array/nested fields, and no-ops if nothing matches.
 */
function focusFirstError(errors: Partial<Record<string, string>>) {
    const firstKey = Object.keys(errors).find((key) => errors[key]);

    if (!firstKey) {
        return;
    }

    const candidates = [firstKey, firstKey.split('.')[0]];
    let target: HTMLElement | null = null;

    for (const candidate of candidates) {
        target =
            document.getElementById(candidate) ??
            document.querySelector<HTMLElement>(`[name="${candidate}"]`);

        if (target) {
            break;
        }
    }

    if (!target) {
        return;
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.focus({ preventScroll: true });
}

/**
 * Client-side Zod validation in front of a normal Inertia visit. On submit,
 * the schema runs first (blocking the request on failure, same field names
 * the server validates); a request that does go out still gets its
 * server-side errors (uniqueness, authorization, etc.) merged in the same
 * way, so both error sources render through one `errors` object.
 */
export function useInertiaZodForm<Schema extends z.ZodObject>(
    schema: Schema,
    initialValues: z.infer<Schema>,
) {
    type Values = z.infer<Schema>;

    const { limits } = usePage().props;
    const [data, setData] = useState<Values>(initialValues);
    const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
    const [processing, setProcessing] = useState(false);

    function setField<K extends keyof Values>(key: K, value: Values[K]) {
        setData((prev) => ({ ...prev, [key]: value }));
        setErrors((prev) => ({ ...prev, [key as string]: undefined }));
    }

    function submit(
        method: Method,
        url: string,
        options?: { onSuccess?: () => void },
    ) {
        const result = schema.safeParse(data);

        if (!result.success) {
            const fieldErrors: Partial<Record<string, string>> = {};

            for (const issue of result.error.issues) {
                const key = String(issue.path[0]);

                if (!(key in fieldErrors)) {
                    fieldErrors[key] = issue.message;
                }
            }

            setErrors(fieldErrors);
            focusFirstError(fieldErrors);

            return;
        }

        // PHP never parses multipart bodies on PUT/PATCH requests, so a
        // file field would silently arrive empty server-side — send those
        // as a POST with a spoofed `_method` instead, which PHP does parse.
        const payload = result.data as Record<string, FormDataConvertible>;

        // PHP silently empties $_POST/$_FILES when a request exceeds
        // post_max_size — Laravel's ValidatePostSize middleware throws
        // before the session even starts, so nothing can be flashed back.
        // Catching an oversized batch here (a multi-file field, or several
        // file fields submitted together) is the only reliable way to give
        // the user a real message instead of a broken page reload.
        const totalFileBytes = sumFileSizes(payload);
        const postMaxBytes = limits.postMaxMb * 1024 * 1024;

        if (totalFileBytes > postMaxBytes * 0.95) {
            const fieldErrors: Partial<Record<string, string>> = {};
            const totalMb = (totalFileBytes / (1024 * 1024)).toFixed(1);
            const message = `These files add up to ${totalMb}MB, which is over the ${limits.postMaxMb}MB the server accepts in one submission. Remove or shrink some before saving.`;

            for (const [key, value] of Object.entries(payload)) {
                if (sumFileSizes(value) > 0) {
                    fieldErrors[key] = message;
                }
            }

            setErrors(fieldErrors);
            focusFirstError(fieldErrors);

            return;
        }

        setProcessing(true);

        const [visitMethod, visitData] =
            method !== 'post' && hasFiles(payload)
                ? (['post', { ...payload, _method: method }] as const)
                : ([method, payload] as const);

        router[visitMethod](url, visitData, {
            preserveScroll: true,
            onSuccess: () => {
                options?.onSuccess?.();
            },
            onError: (serverErrors) => {
                setErrors(serverErrors);
                focusFirstError(serverErrors);
            },
            onFinish: () => {
                setProcessing(false);
            },
        });
    }

    return { data, setField, setData, errors, processing, submit };
}
