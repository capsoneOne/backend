'use client';

import L from 'leaflet';
import {useEffect, useMemo} from 'react';
import {MapContainer, Marker, TileLayer, useMap, useMapEvents} from 'react-leaflet';

export interface MapPosition {
  lat: number;
  lng: number;
}

interface AddressMapProps {
  position: MapPosition | null;
  onPositionChange: (position: MapPosition) => void;
  markerLabel: string;
}

const DEFAULT_CENTER: [number, number] = [11.5564, 104.9282];

function MapInteraction({onPositionChange}: Pick<AddressMapProps, 'onPositionChange'>) {
  useMapEvents({
    click(event) {
      onPositionChange({lat: event.latlng.lat, lng: event.latlng.lng});
    },
  });
  return null;
}

function RecenterMap({position}: {position: MapPosition | null}) {
  const map = useMap();

  useEffect(() => {
    if (position) map.flyTo([position.lat, position.lng], 16, {duration: 0.8});
  }, [map, position]);

  return null;
}

export function AddressMap({position, onPositionChange, markerLabel}: AddressMapProps) {
  const markerIcon = useMemo(() => L.divIcon({
    className: '',
    html: '<span class="address-map-marker" aria-hidden="true"><span></span></span>',
    iconAnchor: [20, 40],
    iconSize: [40, 40],
  }), []);

  return (
    <MapContainer
      center={position ? [position.lat, position.lng] : DEFAULT_CENTER}
      zoom={position ? 16 : 12}
      scrollWheelZoom
      className="h-72 w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
        url={process.env.NEXT_PUBLIC_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'}
      />
      <MapInteraction onPositionChange={onPositionChange}/>
      <RecenterMap position={position}/>
      {position && (
        <Marker
          position={[position.lat, position.lng]}
          icon={markerIcon}
          draggable
          title={markerLabel}
          alt={markerLabel}
          eventHandlers={{
            dragend(event) {
              const point = event.target.getLatLng();
              onPositionChange({lat: point.lat, lng: point.lng});
            },
          }}
        />
      )}
    </MapContainer>
  );
}
