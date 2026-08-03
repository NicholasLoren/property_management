import { Head } from '@inertiajs/react';
import { Bell, Building2, Folder, MessageSquare, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { ComponentType, FormEvent } from 'react';
import InputError from '@/components/input-error';
import { SettingsCard, SettingsRow } from '@/components/settings-card';
import { Button } from '@/components/ui/button';
import { FileDropzone } from '@/components/ui/file-dropzone';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { useInertiaZodForm } from '@/hooks/use-inertia-zod-form';
import { cn } from '@/lib/utils';
import companySettings from '@/routes/company-settings';
import {
    brandingSettingsSchema,
    generalSettingsSchema,
    notificationSettingsSchema,
    smsSettingsSchema,
    testSmsSchema,
} from '@/schemas/settings';

type SectionKey = 'general' | 'branding' | 'sms' | 'notifications' | 'trash';

const SECTIONS: {
    key: SectionKey;
    label: string;
    icon: ComponentType<{ className?: string }>;
}[] = [
    { key: 'general', label: 'General', icon: Building2 },
    { key: 'branding', label: 'Branding & exports', icon: Folder },
    { key: 'sms', label: 'SMS', icon: MessageSquare },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'trash', label: 'Trash & data', icon: Trash2 },
];

type PageProps = {
    general: {
        company_name: string;
        support_email: string;
        default_currency: string;
        timezone: string;
        trash_retention_days: number;
    };
    branding: {
        pdf_header_text: string;
        accent_color: string;
        logo: { name: string; url: string } | null;
    };
    sms: {
        enabled: boolean;
        africastalking_username: string;
        africastalking_api_key: string;
        sender_id: string;
        sandbox: boolean;
        has_api_key: boolean;
    };
    notifications: {
        email_enabled: boolean;
        sms_enabled: boolean;
    };
};

export default function CompanySettings({
    general,
    branding,
    sms,
    notifications,
}: PageProps) {
    const [section, setSection] = useState<SectionKey>('general');

    return (
        <>
            <Head title="Settings" />

            <div className="mb-[22px]">
                <h1 className="text-[21px] font-extrabold tracking-tight">
                    Settings
                </h1>
                <p className="mt-1 text-[13px] text-text-secondary">
                    Configure how Steward works for your company.
                </p>
            </div>

            <div className="grid max-w-[900px] items-start gap-7 md:grid-cols-[200px_1fr]">
                <nav className="flex flex-col gap-0.5 md:sticky md:top-[74px]">
                    {SECTIONS.map((item) => (
                        <button
                            key={item.key}
                            type="button"
                            onClick={() => setSection(item.key)}
                            className={cn(
                                'flex items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-left text-[13.5px] font-medium',
                                section === item.key
                                    ? 'bg-accent-soft font-semibold text-accent-strong'
                                    : 'text-text-secondary hover:bg-secondary hover:text-foreground',
                            )}
                        >
                            <item.icon
                                className={cn(
                                    'size-[15px]',
                                    section === item.key
                                        ? 'text-accent-strong'
                                        : 'text-text-tertiary',
                                )}
                            />
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div>
                    {section === 'general' && (
                        <GeneralSection general={general} />
                    )}
                    {section === 'branding' && (
                        <BrandingSection branding={branding} />
                    )}
                    {section === 'sms' && <SmsSection sms={sms} />}
                    {section === 'notifications' && (
                        <NotificationsSection notifications={notifications} />
                    )}
                    {section === 'trash' && <TrashSection general={general} />}
                </div>
            </div>
        </>
    );
}

function GeneralSection({ general }: { general: PageProps['general'] }) {
    const { data, setField, errors, processing, submit } = useInertiaZodForm(
        generalSettingsSchema,
        general,
    );

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        submit('patch', companySettings.updateGeneral().url);
    }

    return (
        <form onSubmit={handleSubmit} noValidate>
            <SettingsCard
                title="Company details"
                description="Shown on invoices, receipts, and exported reports."
            >
                <div className="grid gap-3.5 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                        <Label htmlFor="company_name">Company name</Label>
                        <Input
                            id="company_name"
                            value={data.company_name}
                            onChange={(e) =>
                                setField('company_name', e.target.value)
                            }
                        />
                        <InputError message={errors.company_name} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="support_email">Support email</Label>
                        <Input
                            id="support_email"
                            type="email"
                            value={data.support_email}
                            onChange={(e) =>
                                setField('support_email', e.target.value)
                            }
                        />
                        <InputError message={errors.support_email} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="default_currency">
                            Default currency
                        </Label>
                        <Input
                            id="default_currency"
                            value={data.default_currency}
                            maxLength={3}
                            onChange={(e) =>
                                setField(
                                    'default_currency',
                                    e.target.value.toUpperCase(),
                                )
                            }
                            placeholder="UGX"
                        />
                        <InputError message={errors.default_currency} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="timezone">Timezone</Label>
                        <Input
                            id="timezone"
                            value={data.timezone}
                            onChange={(e) =>
                                setField('timezone', e.target.value)
                            }
                            placeholder="Africa/Kampala"
                        />
                        <InputError message={errors.timezone} />
                    </div>
                </div>
            </SettingsCard>

            <div className="flex justify-end">
                <Button type="submit" disabled={processing}>
                    {processing && <Spinner />}
                    Save
                </Button>
            </div>
        </form>
    );
}

function BrandingSection({ branding }: { branding: PageProps['branding'] }) {
    const [logoRemoved, setLogoRemoved] = useState(false);
    const { data, setField, errors, processing, submit } = useInertiaZodForm(
        brandingSettingsSchema,
        {
            pdf_header_text: branding.pdf_header_text,
            accent_color: branding.accent_color,
            logo: null,
            logo_remove: false,
        },
    );

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        submit('patch', companySettings.updateBranding().url);
    }

    const existingLogo = !logoRemoved && !data.logo ? branding.logo : null;

    return (
        <form onSubmit={handleSubmit} noValidate>
            <SettingsCard
                title="Logo"
                description="Used on invoices, receipts, and exported reports."
            >
                <FileDropzone
                    accept="image/jpeg,image/png,image/webp,image/svg+xml"
                    value={data.logo ?? null}
                    onChange={(file) => {
                        setField('logo', file);
                        setField('logo_remove', false);
                    }}
                    existing={existingLogo}
                    onRemoveExisting={() => {
                        setLogoRemoved(true);
                        setField('logo_remove', true);
                    }}
                    error={errors.logo}
                />
            </SettingsCard>

            <SettingsCard
                title="PDF & Excel exports"
                description="Applied to the header of every exported report."
            >
                <div className="mb-3.5 grid gap-1.5">
                    <Label htmlFor="pdf_header_text">Header text</Label>
                    <Input
                        id="pdf_header_text"
                        value={data.pdf_header_text}
                        onChange={(e) =>
                            setField('pdf_header_text', e.target.value)
                        }
                    />
                    <InputError message={errors.pdf_header_text} />
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor="accent_color">Accent color</Label>
                    <div className="flex items-center gap-2.5">
                        <input
                            type="color"
                            value={data.accent_color}
                            onChange={(e) =>
                                setField('accent_color', e.target.value)
                            }
                            className="size-9 cursor-pointer rounded-md border border-border-soft"
                        />
                        <Input
                            id="accent_color"
                            value={data.accent_color}
                            onChange={(e) =>
                                setField('accent_color', e.target.value)
                            }
                            className="max-w-[140px]"
                        />
                    </div>
                    <InputError message={errors.accent_color} />
                </div>
            </SettingsCard>

            <div className="flex justify-end">
                <Button type="submit" disabled={processing}>
                    {processing && <Spinner />}
                    Save
                </Button>
            </div>
        </form>
    );
}

function SmsSection({ sms }: { sms: PageProps['sms'] }) {
    const { data, setField, errors, processing, submit } = useInertiaZodForm(
        smsSettingsSchema,
        {
            enabled: sms.enabled,
            africastalking_username: sms.africastalking_username,
            africastalking_api_key: '',
            sender_id: sms.sender_id,
            sandbox: sms.sandbox,
        },
    );

    const {
        data: testData,
        setField: setTestField,
        errors: testErrors,
        processing: testProcessing,
        submit: submitTest,
    } = useInertiaZodForm(testSmsSchema, { phone: '' });

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        submit('patch', companySettings.updateSms().url);
    }

    function handleTestSubmit(e: FormEvent) {
        e.preventDefault();
        submitTest('post', companySettings.testSms().url);
    }

    return (
        <>
            <form onSubmit={handleSubmit} noValidate>
                <SettingsCard
                    title="Africa's Talking"
                    description="Used to send SMS reminders and broadcast messages."
                >
                    <SettingsRow
                        label="Enable SMS"
                        description="Turn on SMS sending across the app."
                    >
                        <Switch
                            checked={data.enabled}
                            onCheckedChange={(checked) =>
                                setField('enabled', checked)
                            }
                        />
                    </SettingsRow>

                    <div className="grid gap-3.5 border-t border-border-soft pt-3.5 sm:grid-cols-2">
                        <div className="grid gap-1.5">
                            <Label htmlFor="africastalking_username">
                                Username
                            </Label>
                            <Input
                                id="africastalking_username"
                                value={data.africastalking_username ?? ''}
                                onChange={(e) =>
                                    setField(
                                        'africastalking_username',
                                        e.target.value,
                                    )
                                }
                            />
                            <InputError
                                message={errors.africastalking_username}
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="africastalking_api_key">
                                API key
                            </Label>
                            <Input
                                id="africastalking_api_key"
                                type="password"
                                value={data.africastalking_api_key ?? ''}
                                onChange={(e) =>
                                    setField(
                                        'africastalking_api_key',
                                        e.target.value,
                                    )
                                }
                                placeholder={
                                    sms.has_api_key
                                        ? 'Leave blank to keep the current key'
                                        : 'Enter API key'
                                }
                            />
                            <InputError
                                message={errors.africastalking_api_key}
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="sender_id">Sender ID</Label>
                            <Input
                                id="sender_id"
                                value={data.sender_id ?? ''}
                                maxLength={11}
                                onChange={(e) =>
                                    setField('sender_id', e.target.value)
                                }
                            />
                            <InputError message={errors.sender_id} />
                        </div>
                    </div>

                    <SettingsRow
                        label="Sandbox mode"
                        description="Send through Africa's Talking's test environment instead of live."
                    >
                        <Switch
                            checked={data.sandbox}
                            onCheckedChange={(checked) =>
                                setField('sandbox', checked)
                            }
                        />
                    </SettingsRow>
                </SettingsCard>

                <div className="flex justify-end">
                    <Button type="submit" disabled={processing}>
                        {processing && <Spinner />}
                        Save
                    </Button>
                </div>
            </form>

            <form onSubmit={handleTestSubmit} noValidate>
                <SettingsCard
                    title="Send a test message"
                    description="Confirms your credentials actually work."
                >
                    <div className="flex items-end gap-2.5">
                        <div className="grid flex-1 gap-1.5">
                            <Label htmlFor="test_phone">Phone number</Label>
                            <Input
                                id="test_phone"
                                value={testData.phone}
                                onChange={(e) =>
                                    setTestField('phone', e.target.value)
                                }
                                placeholder="+2567xxxxxxxx"
                            />
                            <InputError message={testErrors.phone} />
                        </div>
                        <Button type="submit" disabled={testProcessing}>
                            {testProcessing && <Spinner />}
                            Send test
                        </Button>
                    </div>
                </SettingsCard>
            </form>
        </>
    );
}

function NotificationsSection({
    notifications,
}: {
    notifications: PageProps['notifications'];
}) {
    const { data, setField, processing, submit } = useInertiaZodForm(
        notificationSettingsSchema,
        notifications,
    );

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        submit('patch', companySettings.updateNotifications().url);
    }

    return (
        <form onSubmit={handleSubmit} noValidate>
            <SettingsCard
                title="Notification channels"
                description="Which channels Steward is allowed to use company-wide."
            >
                <SettingsRow
                    label="Email"
                    description="Send notifications by email."
                >
                    <Switch
                        checked={data.email_enabled}
                        onCheckedChange={(checked) =>
                            setField('email_enabled', checked)
                        }
                    />
                </SettingsRow>
                <SettingsRow
                    label="SMS"
                    description="Send notifications by SMS. Requires SMS to be configured and enabled."
                >
                    <Switch
                        checked={data.sms_enabled}
                        onCheckedChange={(checked) =>
                            setField('sms_enabled', checked)
                        }
                    />
                </SettingsRow>
            </SettingsCard>

            <div className="flex justify-end">
                <Button type="submit" disabled={processing}>
                    {processing && <Spinner />}
                    Save
                </Button>
            </div>
        </form>
    );
}

function TrashSection({ general }: { general: PageProps['general'] }) {
    const { data, setField, processing, submit } = useInertiaZodForm(
        generalSettingsSchema,
        general,
    );

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        submit('patch', companySettings.updateGeneral().url);
    }

    return (
        <form onSubmit={handleSubmit} noValidate>
            <SettingsCard
                title="Trash retention"
                description="How long deleted records stay recoverable before they are permanently erased."
            >
                <div className="max-w-[280px]">
                    <Label className="mb-1.5 block">
                        Permanently delete items after
                    </Label>
                    <Select
                        value={String(data.trash_retention_days)}
                        onValueChange={(value) =>
                            setField('trash_retention_days', Number(value))
                        }
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {[7, 14, 30, 60, 90].map((days) => (
                                <SelectItem key={days} value={String(days)}>
                                    {days} days
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <p className="mt-2.5 text-xs text-text-tertiary">
                    Applies to every module with a trash: Users and Roles. A
                    daily job permanently deletes anything past this window.
                </p>
            </SettingsCard>

            <div className="flex justify-end">
                <Button type="submit" disabled={processing}>
                    {processing && <Spinner />}
                    Save
                </Button>
            </div>
        </form>
    );
}
