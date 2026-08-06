import { useSyncExternalStore } from 'react';

type BeforeInstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export type UsePwaInstallReturn = {
    readonly canInstall: boolean;
    readonly promptInstall: () => Promise<void>;
};

const listeners = new Set<() => void>();
let deferredEvent: BeforeInstallPromptEvent | null = null;
let initialized = false;

const notify = (): void => listeners.forEach((listener) => listener());

const isStandalone = (): boolean => {
    if (typeof window === 'undefined') {
        return false;
    }

    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        // iOS Safari...
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    );
};

const init = (): void => {
    if (initialized || typeof window === 'undefined' || isStandalone()) {
        return;
    }

    initialized = true;

    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredEvent = event as BeforeInstallPromptEvent;
        notify();
    });

    window.addEventListener('appinstalled', () => {
        deferredEvent = null;
        notify();
    });
};

const subscribe = (callback: () => void) => {
    init();
    listeners.add(callback);

    return () => listeners.delete(callback);
};

const promptInstall = async (): Promise<void> => {
    if (!deferredEvent) {
        return;
    }

    const event = deferredEvent;
    deferredEvent = null;
    notify();

    await event.prompt();
    await event.userChoice;
};

export function usePwaInstall(): UsePwaInstallReturn {
    const canInstall = useSyncExternalStore(
        subscribe,
        () => deferredEvent !== null,
        () => false,
    );

    return { canInstall, promptInstall } as const;
}
