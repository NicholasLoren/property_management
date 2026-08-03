import { useFlashToast } from '@/hooks/use-flash-toast';
import { useAppearance } from '@/hooks/use-appearance';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

function Toaster({ ...props }: ToasterProps) {
    const { appearance } = useAppearance();

    useFlashToast();

    return (
        <Sonner
            theme={appearance}
            richColors
            className="toaster group"
            position="bottom-right"
            style={
                {
                    '--normal-bg': 'var(--popover)',
                    '--normal-text': 'var(--popover-foreground)',
                    '--normal-border': 'var(--border)',
                    '--success-bg': 'var(--success-soft)',
                    '--success-text': 'var(--success)',
                    '--success-border': 'var(--success-soft)',
                    '--error-bg': 'var(--danger-soft)',
                    '--error-text': 'var(--destructive)',
                    '--error-border': 'var(--danger-soft)',
                    '--warning-bg': 'var(--warning-soft)',
                    '--warning-text': 'var(--warning)',
                    '--warning-border': 'var(--warning-soft)',
                    '--info-bg': 'var(--info-soft)',
                    '--info-text': 'var(--info)',
                    '--info-border': 'var(--info-soft)',
                } as React.CSSProperties
            }
            {...props}
        />
    );
}

export { Toaster };
