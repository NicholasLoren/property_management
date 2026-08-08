import { Head, Link, usePage } from '@inertiajs/react';
import {
    Bell,
    Building2,
    CalendarClock,
    Folder,
    Hash,
    MessageSquare,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import type { ComponentType, FormEvent } from 'react';
import InputError from '@/components/input-error';
import { SettingsCard, SettingsRow } from '@/components/settings-card';
import { Button } from '@/components/ui/button';
import { FileDropzone } from '@/components/ui/file-dropzone';
import { ImageCropDialog } from '@/components/ui/image-crop-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import type { SearchableSelectOption } from '@/components/ui/searchable-select';
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
    billingSettingsSchema,
    brandingSettingsSchema,
    codesSettingsSchema,
    generalSettingsSchema,
    notificationSettingsSchema,
    smsSettingsSchema,
    testSmsSchema,
} from '@/schemas/settings';

type SectionKey =
    | 'general'
    | 'branding'
    | 'sms'
    | 'notifications'
    | 'billing'
    | 'codes'
    | 'trash';

const SECTIONS: {
    key: SectionKey;
    label: string;
    icon: ComponentType<{ className?: string }>;
}[] = [
    { key: 'general', label: 'General', icon: Building2 },
    { key: 'branding', label: 'Branding & exports', icon: Folder },
    { key: 'sms', label: 'SMS', icon: MessageSquare },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'billing', label: 'Billing & reminders', icon: CalendarClock },
    { key: 'codes', label: 'Codes', icon: Hash },
    { key: 'trash', label: 'Trash & data', icon: Trash2 },
];

type PageProps = {
    section: SectionKey;
    timezones: SearchableSelectOption[];
    general: {
        app_name: string;
        company_name: string;
        support_email: string;
        address: string;
        phone: string;
        default_currency: string;
        timezone: string;
        trash_retention_days: number;
    };
    branding: {
        pdf_header_text: string;
        primary_color: string;
        accent_color: string;
        logo: { name: string; url: string } | null;
        app_icon: { name: string; url: string } | null;
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
    billing: {
        days_in_month: number;
        rent_reminder_days_before: number;
        rent_overdue_reminder_days_after: number;
        rent_overdue_reminder_repeat_days: number;
    };
    codes: {
        property_prefix: string;
        property_template: string;
        unit_prefix: string;
        unit_template: string;
        document_prefix: string;
        document_template: string;
        expense_prefix: string;
        expense_template: string;
        income_prefix: string;
        income_template: string;
    };
};

export default function CompanySettings({
    section,
    general,
    branding,
    sms,
    notifications,
    billing,
    codes,
    timezones,
}: PageProps) {
    return (
        <>
            <Head title="Settings" />

            <div className="mb-[22px]">
                <h1 className="text-[21px] font-extrabold tracking-tight">
                    Settings
                </h1>
                <p className="mt-1 text-[13px] text-text-secondary">
                    Configure how {general.app_name} works for your company.
                </p>
            </div>

            <div className="grid max-w-[900px] items-start gap-7 md:grid-cols-[200px_1fr]">
                <nav className="flex flex-col gap-0.5 md:sticky md:top-[74px]">
                    {SECTIONS.map((item) => (
                        <Link
                            key={item.key}
                            href={companySettings.edit(item.key)}
                            prefetch
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
                        </Link>
                    ))}
                </nav>

                <div>
                    {section === 'general' && (
                        <GeneralSection
                            general={general}
                            timezones={timezones}
                        />
                    )}
                    {section === 'branding' && (
                        <BrandingSection branding={branding} />
                    )}
                    {section === 'sms' && <SmsSection sms={sms} />}
                    {section === 'notifications' && (
                        <NotificationsSection notifications={notifications} />
                    )}
                    {section === 'billing' && (
                        <BillingSection billing={billing} />
                    )}
                    {section === 'codes' && <CodesSection codes={codes} />}
                    {section === 'trash' && <TrashSection general={general} />}
                </div>
            </div>
        </>
    );
}

function GeneralSection({
    general,
    timezones,
}: {
    general: PageProps['general'];
    timezones: PageProps['timezones'];
}) {
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
                description="Your app's identity in the interface, and your formal business details shown on invoices, receipts, and exported reports."
            >
                <div className="grid gap-3.5 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                        <Label htmlFor="app_name">App name</Label>
                        <Input
                            id="app_name"
                            value={data.app_name}
                            onChange={(e) =>
                                setField('app_name', e.target.value)
                            }
                        />
                        <p className="text-xs text-text-tertiary">
                            Shown in the sidebar and browser tab.
                        </p>
                        <InputError message={errors.app_name} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="company_name">Company name</Label>
                        <Input
                            id="company_name"
                            value={data.company_name}
                            onChange={(e) =>
                                setField('company_name', e.target.value)
                            }
                        />
                        <p className="text-xs text-text-tertiary">
                            Used on invoices, receipts, and exported reports.
                        </p>
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
                        <Label htmlFor="phone">Contact phone</Label>
                        <Input
                            id="phone"
                            type="tel"
                            value={data.phone}
                            onChange={(e) => setField('phone', e.target.value)}
                            placeholder="+2567xxxxxxxx"
                        />
                        <InputError message={errors.phone} />
                    </div>
                    <div className="grid gap-1.5 sm:col-span-2">
                        <Label htmlFor="address">Address</Label>
                        <Input
                            id="address"
                            value={data.address}
                            onChange={(e) =>
                                setField('address', e.target.value)
                            }
                            placeholder="Plot 12, Kira Road, Kampala"
                        />
                        <InputError message={errors.address} />
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
                        <SearchableSelect
                            id="timezone"
                            value={data.timezone || null}
                            onChange={(value) =>
                                setField('timezone', value ?? '')
                            }
                            options={timezones}
                            placeholder="Select a timezone…"
                            searchPlaceholder="Search timezones…"
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

const APP_ICON_OUTPUT_SIZE = 512;

function BrandingSection({ branding }: { branding: PageProps['branding'] }) {
    const [logoRemoved, setLogoRemoved] = useState(false);
    const [appIconRemoved, setAppIconRemoved] = useState(false);
    const [appIconToCrop, setAppIconToCrop] = useState<File | null>(null);
    const { data, setField, errors, processing, submit } = useInertiaZodForm(
        brandingSettingsSchema,
        {
            pdf_header_text: branding.pdf_header_text,
            primary_color: branding.primary_color,
            accent_color: branding.accent_color,
            logo: null,
            logo_remove: false,
            app_icon: null,
            app_icon_remove: false,
        },
    );

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        submit('patch', companySettings.updateBranding().url);
    }

    const existingLogo = !logoRemoved && !data.logo ? branding.logo : null;
    const existingAppIcon =
        !appIconRemoved && !data.app_icon ? branding.app_icon : null;

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
                title="App icon"
                description="Used for the browser favicon, and the icon shown when the app is installed to a phone or desktop. Any image works — you’ll crop it to a square next."
            >
                <FileDropzone
                    accept="image/jpeg,image/png,image/webp"
                    value={data.app_icon ?? null}
                    onChange={(file) => {
                        if (file) {
                            setAppIconToCrop(file);

                            return;
                        }

                        setField('app_icon', null);
                    }}
                    existing={existingAppIcon}
                    onRemoveExisting={() => {
                        setAppIconRemoved(true);
                        setField('app_icon_remove', true);
                    }}
                    error={errors.app_icon}
                />
                <ImageCropDialog
                    file={appIconToCrop}
                    outputSize={APP_ICON_OUTPUT_SIZE}
                    onCropped={(cropped) => {
                        setField('app_icon', cropped);
                        setField('app_icon_remove', false);
                        setAppIconToCrop(null);
                    }}
                    onCancel={() => setAppIconToCrop(null)}
                />
            </SettingsCard>

            <SettingsCard
                title="Theme colors"
                description="Used throughout the app — Primary drives buttons and other solid controls; Accent drives highlights like the active nav item, links, and focus rings. Readable text on top of each is worked out automatically."
            >
                <div className="grid gap-3.5 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                        <Label htmlFor="primary_color">Primary color</Label>
                        <div className="flex items-center gap-2.5">
                            <input
                                type="color"
                                value={data.primary_color}
                                onChange={(e) =>
                                    setField('primary_color', e.target.value)
                                }
                                className="size-9 cursor-pointer rounded-md border border-border-soft"
                            />
                            <Input
                                id="primary_color"
                                value={data.primary_color}
                                onChange={(e) =>
                                    setField('primary_color', e.target.value)
                                }
                                className="max-w-[140px]"
                            />
                        </div>
                        <InputError message={errors.primary_color} />
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
                </div>
            </SettingsCard>

            <SettingsCard
                title="PDF & Excel exports"
                description="Applied to the header of every exported report."
            >
                <div className="grid gap-1.5">
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
                                value={
                                    data.sandbox
                                        ? 'sandbox'
                                        : (data.africastalking_username ?? '')
                                }
                                disabled={data.sandbox}
                                onChange={(e) =>
                                    setField(
                                        'africastalking_username',
                                        e.target.value,
                                    )
                                }
                            />
                            <p className="text-xs text-text-tertiary">
                                {data.sandbox
                                    ? 'Sandbox mode always uses "sandbox" as the username — this is handled automatically.'
                                    : 'Your Africa’s Talking account username.'}
                            </p>
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
                            <p className="text-xs text-text-tertiary">
                                Sandbox and live apps have separate API keys —
                                use the sandbox app's key while sandbox mode is
                                on.
                            </p>
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
    const { name } = usePage().props;
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
                description={`Which channels ${name} is allowed to use company-wide.`}
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

function BillingSection({ billing }: { billing: PageProps['billing'] }) {
    const { data, setField, errors, processing, submit } = useInertiaZodForm(
        billingSettingsSchema,
        billing,
    );

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        submit('patch', companySettings.updateBilling().url);
    }

    function numberField(key: keyof typeof data, min: number, max: number) {
        return (
            <Input
                id={key}
                type="number"
                min={min}
                max={max}
                className="w-24"
                value={data[key]}
                onChange={(e) => setField(key, Number(e.target.value))}
            />
        );
    }

    return (
        <form onSubmit={handleSubmit} noValidate>
            <SettingsCard
                title="Rent periods"
                description="How rent periods and prorated stub periods are calculated."
            >
                <SettingsRow
                    label="Days in a month"
                    description="Day-count convention used to prorate a partial billing period, e.g. when a lease's due day differs from its move-in day."
                >
                    <div className="flex flex-col items-end gap-1">
                        {numberField('days_in_month', 28, 31)}
                        <InputError message={errors.days_in_month} />
                    </div>
                </SettingsRow>
            </SettingsCard>

            <SettingsCard
                title="Rent reminders"
                description="When automated rent-collection reminders go out to landlords and staff."
            >
                <SettingsRow
                    label="Remind before rent is due"
                    description="Send a reminder this many days before a rent period's due date."
                >
                    <div className="flex flex-col items-end gap-1">
                        {numberField('rent_reminder_days_before', 0, 30)}
                        <InputError
                            message={errors.rent_reminder_days_before}
                        />
                    </div>
                </SettingsRow>
                <SettingsRow
                    label="Flag as overdue after"
                    description="Send the first overdue reminder this many days after a missed due date."
                >
                    <div className="flex flex-col items-end gap-1">
                        {numberField('rent_overdue_reminder_days_after', 0, 30)}
                        <InputError
                            message={errors.rent_overdue_reminder_days_after}
                        />
                    </div>
                </SettingsRow>
                <SettingsRow
                    label="Repeat overdue reminders every"
                    description="How often to resend the overdue reminder while a period stays unpaid."
                >
                    <div className="flex flex-col items-end gap-1">
                        {numberField(
                            'rent_overdue_reminder_repeat_days',
                            1,
                            30,
                        )}
                        <InputError
                            message={errors.rent_overdue_reminder_repeat_days}
                        />
                    </div>
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

const CODE_TYPES: { key: string; label: string; example: string }[] = [
    {
        key: 'property',
        label: 'Properties',
        example: 'e.g. Kisementi Apartments',
    },
    { key: 'unit', label: 'Units', example: 'e.g. Unit 4B' },
    {
        key: 'document',
        label: 'Documents',
        example: 'e.g. Fire safety certificate',
    },
    { key: 'expense', label: 'Expenses', example: 'e.g. Water bill' },
    { key: 'income', label: 'Income', example: 'e.g. Parking fee' },
];

/**
 * Rough client-side stand-in for App\Services\CodeGenerator::generate() —
 * good enough for a live "what would this look like" preview, not meant to
 * byte-for-byte match the server (real sequence numbers and PHP date()
 * formatting live there).
 */
function previewCode(prefix: string, template: string): string {
    return template.replace(
        /\{([a-z]+)(?::([^}]+))?\}/gi,
        (whole: string, token: string, arg?: string) => {
            switch (token.toLowerCase()) {
                case 'prefix':
                    return prefix || 'PREFIX';
                case 'seq':
                    return '1'.padStart(arg ? Number(arg) || 4 : 4, '0');
                case 'date': {
                    const now = new Date();

                    if (arg === 'Ymd') {
                        return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
                    }

                    return String(now.getFullYear());
                }
                case 'id':
                    return '42';
                default:
                    return whole;
            }
        },
    );
}

function CodesSection({ codes }: { codes: PageProps['codes'] }) {
    const { data, setField, errors, processing, submit } = useInertiaZodForm(
        codesSettingsSchema,
        codes,
    );

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        submit('patch', companySettings.updateCodes().url);
    }

    return (
        <form onSubmit={handleSubmit} noValidate>
            <SettingsCard
                title="Code formats"
                description="Every Property, Unit, Document, Expense, and Income record gets a unique, searchable code when it's created. Pick a prefix and a template for each."
            >
                <div className="mb-4 rounded-lg border border-border-soft bg-secondary/50 p-3 text-xs text-text-secondary">
                    <span className="font-semibold text-foreground">
                        Variables:
                    </span>{' '}
                    <code className="rounded bg-card px-1 py-0.5">
                        {'{prefix}'}
                    </code>{' '}
                    the prefix below,{' '}
                    <code className="rounded bg-card px-1 py-0.5">
                        {'{seq:4}'}
                    </code>{' '}
                    an auto-incrementing number padded to N digits,{' '}
                    <code className="rounded bg-card px-1 py-0.5">
                        {'{date:Y}'}
                    </code>{' '}
                    or{' '}
                    <code className="rounded bg-card px-1 py-0.5">
                        {'{date:Ymd}'}
                    </code>{' '}
                    today's date, and{' '}
                    <code className="rounded bg-card px-1 py-0.5">
                        {'{id}'}
                    </code>{' '}
                    the record's own ID. Unrecognized text is kept as-is, so a
                    typo never blocks saving a record.
                </div>

                <div className="grid gap-4">
                    {CODE_TYPES.map((type) => {
                        const prefixKey =
                            `${type.key}_prefix` as keyof typeof data;
                        const templateKey =
                            `${type.key}_template` as keyof typeof data;
                        const prefixValue = data[prefixKey] as string;
                        const templateValue = data[templateKey] as string;

                        return (
                            <div
                                key={type.key}
                                className="grid gap-2.5 border-t border-border-soft pt-4 first:border-0 first:pt-0 sm:grid-cols-[120px_1fr_1fr]"
                            >
                                <div>
                                    <div className="text-[13px] font-semibold">
                                        {type.label}
                                    </div>
                                    <div className="text-xs text-text-tertiary">
                                        {type.example}
                                    </div>
                                </div>
                                <div className="grid gap-1.5">
                                    <Label htmlFor={`${type.key}_prefix`}>
                                        Prefix
                                    </Label>
                                    <Input
                                        id={`${type.key}_prefix`}
                                        value={prefixValue}
                                        maxLength={20}
                                        onChange={(e) =>
                                            setField(
                                                prefixKey,
                                                e.target.value.toUpperCase(),
                                            )
                                        }
                                    />
                                    <InputError message={errors[prefixKey]} />
                                </div>
                                <div className="grid gap-1.5">
                                    <Label htmlFor={`${type.key}_template`}>
                                        Template
                                    </Label>
                                    <Input
                                        id={`${type.key}_template`}
                                        value={templateValue}
                                        onChange={(e) =>
                                            setField(
                                                templateKey,
                                                e.target.value,
                                            )
                                        }
                                    />
                                    <InputError message={errors[templateKey]} />
                                    <p className="font-mono text-xs text-text-tertiary">
                                        Preview:{' '}
                                        {previewCode(
                                            prefixValue,
                                            templateValue,
                                        )}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
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
