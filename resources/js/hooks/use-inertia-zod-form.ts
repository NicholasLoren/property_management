import type { FormDataConvertible } from '@inertiajs/core';
import { hasFiles } from '@inertiajs/core';
import { router } from '@inertiajs/react';
import { useState } from 'react';
import type { z } from 'zod';

type Method = 'post' | 'patch' | 'put';

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

            return;
        }

        setProcessing(true);

        // PHP never parses multipart bodies on PUT/PATCH requests, so a
        // file field would silently arrive empty server-side — send those
        // as a POST with a spoofed `_method` instead, which PHP does parse.
        const payload = result.data as Record<string, FormDataConvertible>;
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
            },
            onFinish: () => {
                setProcessing(false);
            },
        });
    }

    return { data, setField, setData, errors, processing, submit };
}
