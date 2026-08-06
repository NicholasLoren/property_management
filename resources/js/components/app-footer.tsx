import { usePage } from '@inertiajs/react';

export function AppFooter() {
    const { name } = usePage().props;

    return (
        <footer className="shrink-0 border-t border-border-soft px-5 py-4 text-[12.5px] text-text-tertiary sm:px-[30px]">
            &copy; {new Date().getFullYear()} {name}. All rights reserved.
        </footer>
    );
}
