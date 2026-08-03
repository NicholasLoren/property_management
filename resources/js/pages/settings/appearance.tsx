import { Head } from '@inertiajs/react';
import { SettingsCard } from '@/components/settings-card';
import { ThemePicker } from '@/components/theme-picker';
import { edit as editAppearance } from '@/routes/appearance';

export default function Appearance() {
    return (
        <>
            <Head title="Appearance settings" />

            <h1 className="sr-only">Appearance settings</h1>

            <SettingsCard
                title="Theme"
                description="Choose how Steward looks on this device."
            >
                <ThemePicker />
            </SettingsCard>
        </>
    );
}

Appearance.layout = {
    breadcrumbs: [
        {
            title: 'Appearance settings',
            href: editAppearance(),
        },
    ],
};
