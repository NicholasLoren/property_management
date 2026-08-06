import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import { defaultMarkerIcon } from '@/lib/leaflet-icon';

type PropertyLocationMapProps = {
    latitude: number;
    longitude: number;
};

// Loaded only on the client — see PropertyShow, which dynamic-imports this
// inside a useEffect. leaflet/react-leaflet touch `window` at module load
// time, which crashes Inertia's SSR render if this ends up in the server
// bundle's static import graph.
export default function PropertyLocationMap({
    latitude,
    longitude,
}: PropertyLocationMapProps) {
    return (
        <MapContainer
            center={[latitude, longitude]}
            zoom={16}
            scrollWheelZoom={false}
            dragging={false}
            doubleClickZoom={false}
            zoomControl={false}
            attributionControl={false}
            className="size-full"
        >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker position={[latitude, longitude]} icon={defaultMarkerIcon} />
        </MapContainer>
    );
}
