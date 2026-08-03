import { Form, Head } from '@inertiajs/react';
import { Lock, Mail, ShieldCheck } from 'lucide-react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
};

export default function Login({ status, canResetPassword }: Props) {
    return (
        <>
            <Head title="Log in" />

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-4"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="flex flex-col gap-1.5">
                            <Label
                                htmlFor="email"
                                className="text-[12.5px] font-semibold"
                            >
                                Email address
                            </Label>
                            <div className="relative flex items-center">
                                <Mail className="pointer-events-none absolute left-[11px] size-[15px] text-text-tertiary" />
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="email"
                                    placeholder="you@company.com"
                                    className="pl-9"
                                />
                            </div>
                            <InputError message={errors.email} />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label
                                htmlFor="password"
                                className="text-[12.5px] font-semibold"
                            >
                                Password
                            </Label>
                            <div className="relative flex items-center">
                                <Lock className="pointer-events-none absolute left-[11px] z-10 size-[15px] text-text-tertiary" />
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    required
                                    tabIndex={2}
                                    autoComplete="current-password"
                                    placeholder="••••••••••"
                                    className="pl-9"
                                />
                            </div>
                            <InputError message={errors.password} />
                        </div>

                        <div className="mb-1 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    tabIndex={3}
                                />
                                <Label
                                    htmlFor="remember"
                                    className="text-[13px] font-normal text-text-secondary"
                                >
                                    Remember me
                                </Label>
                            </div>
                            {canResetPassword && (
                                <TextLink
                                    href={request()}
                                    className="text-[12.5px] font-semibold text-accent-strong no-underline hover:underline"
                                    tabIndex={4}
                                >
                                    Forgot password?
                                </TextLink>
                            )}
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            tabIndex={5}
                            disabled={processing}
                            data-test="login-button"
                        >
                            {processing && <Spinner />}
                            Sign in
                        </Button>

                        <div className="mt-1.5 flex items-center gap-1.5 rounded-[6px] border border-border-soft bg-secondary px-3 py-2.5 text-[12px] text-text-secondary">
                            <ShieldCheck className="size-[15px] shrink-0 text-accent-strong" />
                            Protected by two-factor authentication when enabled
                            on your account.
                        </div>

                        <p className="mt-2.5 border-t border-border-soft pt-4 text-center text-[12px] leading-relaxed text-text-tertiary">
                            Steward is invite-only. If you need access, ask your
                            administrator to add you from{' '}
                            <strong className="font-semibold text-text-secondary">
                                Users → Invite user
                            </strong>
                            .
                        </p>
                    </>
                )}
            </Form>

            {status && (
                <div className="mb-4 text-center text-sm font-medium text-green-600">
                    {status}
                </div>
            )}
        </>
    );
}

Login.layout = {
    title: 'Welcome back',
    description: 'Sign in to your Steward account to continue.',
};
