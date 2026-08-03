import { Laptop, Moon, Sun } from 'lucide-react';
import type { ComponentType } from 'react';
import { useAppearance } from '@/hooks/use-appearance';
import type { Appearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';

const THEME_OPTIONS: {
    value: Appearance;
    label: string;
    icon: ComponentType<{ className?: string }>;
    bar: string;
    side: string;
    main: string;
    lineA: string;
    lineB: string;
}[] = [
    {
        value: 'light',
        label: 'Light',
        icon: Sun,
        bar: '#DBE0D9',
        side: '#EEF1ED',
        main: '#FFFFFF',
        lineA: '#DBE0D9',
        lineB: '#E3F0EA',
    },
    {
        value: 'dark',
        label: 'Dark',
        icon: Moon,
        bar: '#2B342E',
        side: '#202822',
        main: '#171B19',
        lineA: '#2B342E',
        lineB: 'rgba(79,191,164,0.3)',
    },
    {
        value: 'system',
        label: 'System',
        icon: Laptop,
        bar: 'linear-gradient(90deg,#DBE0D9 50%,#2B342E 50%)',
        side: 'linear-gradient(180deg,#EEF1ED 50%,#202822 50%)',
        main: 'linear-gradient(90deg,#FFFFFF 50%,#171B19 50%)',
        lineA: '#DBE0D9',
        lineB: '#8A9188',
    },
];

export function ThemePicker() {
    const { appearance, updateAppearance } = useAppearance();

    return (
        <div className="grid grid-cols-3 gap-3">
            {THEME_OPTIONS.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    onClick={() => updateAppearance(option.value)}
                    className={cn(
                        'rounded-[10px] border-[1.5px] p-2.5 text-left',
                        appearance === option.value
                            ? 'border-accent-brand shadow-[0_0_0_3px_var(--accent-soft)]'
                            : 'border-border hover:border-text-tertiary',
                    )}
                >
                    <div className="mb-2 flex h-14 flex-col overflow-hidden rounded-[7px] border border-border-soft">
                        <div
                            className="h-2.5"
                            style={{ background: option.bar }}
                        />
                        <div className="flex flex-1">
                            <div
                                className="w-[22%]"
                                style={{ background: option.side }}
                            />
                            <div
                                className="flex flex-1 flex-col gap-1 p-1.5"
                                style={{ background: option.main }}
                            >
                                <div
                                    className="h-1 w-[70%] rounded-full"
                                    style={{ background: option.lineA }}
                                />
                                <div
                                    className="h-1 w-[45%] rounded-full"
                                    style={{ background: option.lineB }}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-[12.5px] font-semibold">
                        {option.label}
                        <option.icon
                            className={cn(
                                'size-[15px]',
                                appearance === option.value
                                    ? 'text-accent-strong'
                                    : 'text-text-tertiary',
                            )}
                        />
                    </div>
                </button>
            ))}
        </div>
    );
}
