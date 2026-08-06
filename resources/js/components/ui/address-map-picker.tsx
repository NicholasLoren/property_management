import { Loader2, MapPin, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import geocode from '@/routes/geocode';

type Suggestion = { label: string; latitude: number; longitude: number };

type AddressMapPickerProps = {
    address: string;
    onAddressChange: (address: string) => void;
    latitude: number | null;
    longitude: number | null;
    onLocationChange: (latitude: number | null, longitude: number | null) => void;
    error?: string;
    disabled?: boolean;
};

type AddressMapLeafletProps = {
    hasLocation: boolean;
    latitude: number | null;
    longitude: number | null;
    disabled?: boolean;
    onPlace: (lat: number, lng: number) => void;
};

// Loaded only on the client (see the useEffect below) — leaflet/react-leaflet
// touch `window` at module load time, which crashes Inertia's SSR render if
// this ends up in the server bundle's static import graph. A dynamic
// import() inside useEffect never runs during SSR, so this is the only
// reliable way to keep Leaflet out of it (Suspense/React.lazy alone doesn't
// guarantee that with renderToString-style SSR).
export function AddressMapPicker({
    address,
    onAddressChange,
    latitude,
    longitude,
    onLocationChange,
    error,
    disabled,
}: AddressMapPickerProps) {
    const [query, setQuery] = useState(address);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searching, setSearching] = useState(false);
    const [reverseGeocoding, setReverseGeocoding] = useState(false);
    const [MapImpl, setMapImpl] = useState<ComponentType<AddressMapLeafletProps> | null>(
        null,
    );
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const hasLocation = latitude !== null && longitude !== null;

    useEffect(() => {
        let active = true;

        import('@/components/ui/address-map-leaflet').then((mod) => {
            if (active) {
                setMapImpl(() => mod.default);
            }
        });

        return () => {
            active = false;
        };
    }, []);

    function handleQueryChange(value: string) {
        setQuery(value);
        onAddressChange(value);

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        if (value.trim().length < 3) {
            setSuggestions([]);
            return;
        }

        setSearching(true);
        debounceRef.current = setTimeout(async () => {
            try {
                const response = await fetch(
                    geocode.search({ query: { q: value } }).url,
                );
                const results: Suggestion[] = await response.json();
                setSuggestions(results);
                setShowSuggestions(true);
            } finally {
                setSearching(false);
            }
        }, 400);
    }

    function selectSuggestion(suggestion: Suggestion) {
        setQuery(suggestion.label);
        onAddressChange(suggestion.label);
        onLocationChange(suggestion.latitude, suggestion.longitude);
        setSuggestions([]);
        setShowSuggestions(false);
    }

    async function placePin(lat: number, lng: number) {
        onLocationChange(lat, lng);
        setReverseGeocoding(true);

        try {
            const response = await fetch(
                geocode.reverse({
                    query: { latitude: lat, longitude: lng },
                }).url,
            );
            const result: { label: string | null } = await response.json();

            if (result.label) {
                setQuery(result.label);
                onAddressChange(result.label);
            }
        } finally {
            setReverseGeocoding(false);
        }
    }

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
        };
    }, []);

    return (
        <div className="grid gap-2">
            <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-tertiary" />
                <Input
                    value={query}
                    disabled={disabled}
                    onChange={(e) => handleQueryChange(e.target.value)}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    onBlur={() => {
                        // Delay so a click on a suggestion registers before the list unmounts.
                        blurTimeoutRef.current = setTimeout(
                            () => setShowSuggestions(false),
                            150,
                        );
                    }}
                    placeholder="Search for an address…"
                    className="pl-9"
                />
                {searching && (
                    <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-text-tertiary" />
                )}

                {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-border-soft bg-card shadow-md">
                        {suggestions.map((suggestion, index) => (
                            <button
                                key={`${suggestion.latitude}-${suggestion.longitude}-${index}`}
                                type="button"
                                onClick={() => selectSuggestion(suggestion)}
                                className="flex w-full items-start gap-2 px-3 py-2 text-left text-[13px] hover:bg-secondary"
                            >
                                <MapPin className="mt-0.5 size-3.5 shrink-0 text-text-tertiary" />
                                <span>{suggestion.label}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="relative h-56 overflow-hidden rounded-lg border border-border-soft">
                {MapImpl ? (
                    <MapImpl
                        hasLocation={hasLocation}
                        latitude={latitude}
                        longitude={longitude}
                        disabled={disabled}
                        onPlace={placePin}
                    />
                ) : (
                    <div className="flex size-full items-center justify-center bg-secondary/50 text-xs text-text-tertiary">
                        Loading map…
                    </div>
                )}
                {reverseGeocoding && (
                    <div className="absolute top-2 right-2 z-[1000] flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-xs text-text-secondary shadow-sm">
                        <Loader2 className="size-3 animate-spin" />
                        Looking up address…
                    </div>
                )}
            </div>

            <p className="text-xs text-text-tertiary">
                Search above, or click/drag the pin to set the exact location.
            </p>

            <InputError message={error} />
        </div>
    );
}
