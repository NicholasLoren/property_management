import { useEffect, useRef } from 'react';
import SignaturePadLib from 'signature_pad';
import { Button } from '@/components/ui/button';

type SignaturePadProps = {
    onChange: (dataUrl: string | null) => void;
    disabled?: boolean;
};

export function SignaturePad({ onChange, disabled }: SignaturePadProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const padRef = useRef<SignaturePadLib | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas) {
            return;
        }

        const resize = () => {
            const ratio = Math.max(window.devicePixelRatio || 1, 1);
            const { width, height } = canvas.getBoundingClientRect();
            canvas.width = width * ratio;
            canvas.height = height * ratio;
            canvas.getContext('2d')?.scale(ratio, ratio);
            padRef.current?.clear();
        };

        const pad = new SignaturePadLib(canvas, { penColor: '#13181a' });
        padRef.current = pad;

        const handleEnd = () => {
            onChange(pad.isEmpty() ? null : pad.toDataURL('image/png'));
        };
        pad.addEventListener('endStroke', handleEnd);

        resize();
        window.addEventListener('resize', resize);

        return () => {
            window.removeEventListener('resize', resize);
            pad.removeEventListener('endStroke', handleEnd);
            pad.off();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (disabled) {
            padRef.current?.off();
        } else {
            padRef.current?.on();
        }
    }, [disabled]);

    function clear() {
        padRef.current?.clear();
        onChange(null);
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="overflow-hidden rounded-lg border border-border-soft bg-white">
                <canvas
                    ref={canvasRef}
                    className="h-[160px] w-full touch-none"
                />
            </div>
            <div className="flex items-center justify-between">
                <p className="text-xs text-text-tertiary">
                    Sign above using your mouse, stylus, or finger.
                </p>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clear}
                    disabled={disabled}
                >
                    Clear
                </Button>
            </div>
        </div>
    );
}
