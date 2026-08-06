import type L from 'leaflet';
import { useEffect } from 'react';
import {
    MapContainer,
    Marker,
    TileLayer,
    useMap,
    useMapEvents,
} from 'react-leaflet';
import { defaultMarkerIcon } from '@/lib/leaflet-icon';

// Kampala, Uganda — this app's primary market — used when no location has
// been picked yet, so the map opens somewhere relevant instead of the
// middle of the ocean (0, 0).
const DEFAULT_CENTER: [number, number] = [0.3476, 32.5825];
const DEFAULT_ZOOM = 12;
const PICKED_ZOOM = 16;

function ClickToPlace({
    onPlace,
}: {
    onPlace: (lat: number, lng: number) => void;
}) {
    useMapEvents({
        click: (e) => onPlace(e.latlng.lat, e.latlng.lng),
    });

    return null;
}

// react-leaflet only reads `center`/`zoom` on the initial render, so
// picking a new address after the map has already mounted needs an
// explicit `setView` to actually move the viewport.
function Recenter({ lat, lng }: { lat: number; lng: number }) {
    const map = useMap();

    useEffect(() => {
        map.setView([lat, lng], Math.max(map.getZoom(), PICKED_ZOOM));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lat, lng]);

    return null;
}

type AddressMapLeafletProps = {
    hasLocation: boolean;
    latitude: number | null;
    longitude: number | null;
    disabled?: boolean;
    onPlace: (lat: number, lng: number) => void;
};

// Split out from AddressMapPicker and loaded only via dynamic import
// (see AddressMapPicker) — leaflet/react-leaflet touch `window` at module
// load time, which crashes Inertia's SSR render if this ever ends up in
// the server bundle's static import graph.
export default function AddressMapLeaflet({
    hasLocation,
    latitude,
    longitude,
    disabled,
    onPlace,
}: AddressMapLeafletProps) {
    const center: [number, number] =
        hasLocation && latitude !== null && longitude !== null
            ? [latitude, longitude]
            : DEFAULT_CENTER;

    return (
        <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} className="size-full">
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ClickToPlace onPlace={onPlace} />
            {hasLocation && latitude !== null && longitude !== null && (
                <>
                    <Recenter lat={latitude} lng={longitude} />
                    <Marker
                        position={center}
                        icon={defaultMarkerIcon}
                        draggable={!disabled}
                        eventHandlers={{
                            dragend: (e) => {
                                const marker = e.target as L.Marker;
                                const { lat, lng } = marker.getLatLng();
                                onPlace(lat, lng);
                            },
                        }}
                    />
                </>
            )}
        </MapContainer>
    );
}
