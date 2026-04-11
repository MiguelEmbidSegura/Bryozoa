"use client";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import L, { divIcon } from "leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

export type MapMarker = {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  subtitle?: string | null;
};

export type RecordMapProps = {
  markers: MapMarker[];
  heightClassName?: string;
  syncBounds?: boolean;
  interactive?: boolean;
  showPopups?: boolean;
};

const markerIcon = divIcon({
  className: "bryozoo-marker",
  html: '<span class="bryozoo-marker-dot"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function MapFitter({ markers }: { markers: MapMarker[] }) {
  const map = useMap();

  useEffect(() => {
    if (markers.length === 0) return;
    if (markers.length === 1) {
      map.setView([markers[0].latitude, markers[0].longitude], 6);
      return;
    }

    const bounds = L.latLngBounds(markers.map((marker) => [marker.latitude, marker.longitude]));
    map.fitBounds(bounds.pad(0.2));
  }, [map, markers]);

  return null;
}

function BoundsSync({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  useMapEvents({
    moveend(event) {
      if (!enabled) return;

      const bounds = event.target.getBounds();
      const next = new URLSearchParams(params.toString());
      next.set("minLat", bounds.getSouth().toFixed(4));
      next.set("maxLat", bounds.getNorth().toFixed(4));
      next.set("minLng", bounds.getWest().toFixed(4));
      next.set("maxLng", bounds.getEast().toFixed(4));

      const url = `${pathname}?${next.toString()}`;
      router.replace(url, { scroll: false });
    },
  });

  return null;
}

export function RecordMap({
  markers,
  heightClassName = "h-[540px]",
  syncBounds = false,
  interactive = true,
  showPopups = true,
}: RecordMapProps) {
  return (
    <div className={`overflow-hidden rounded-[28px] border border-[var(--border)] ${heightClassName}`}>
      <MapContainer
        center={[20, 0]}
        zoom={2}
        scrollWheelZoom={interactive}
        dragging={interactive}
        touchZoom={interactive}
        doubleClickZoom={interactive}
        boxZoom={interactive}
        keyboard={interactive}
        zoomControl={interactive}
        attributionControl={interactive}
        className="h-full w-full"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url={process.env.NEXT_PUBLIC_MAP_TILE_URL ?? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}
        />
        <MapFitter markers={markers} />
        <BoundsSync enabled={syncBounds} />
        <MarkerClusterGroup chunkedLoading>
          {markers.map((marker) => (
            <Marker
              key={marker.id}
              position={[marker.latitude, marker.longitude]}
              icon={markerIcon}
            >
              {showPopups ? (
                <Popup>
                  <div className="space-y-2">
                    <p className="font-semibold text-slate-900">{marker.title}</p>
                    {marker.subtitle ? <p className="text-sm text-slate-600">{marker.subtitle}</p> : null}
                    <Link href={`/records/${marker.id}`} className="text-sm font-medium text-teal-700">
                      Open record
                    </Link>
                  </div>
                </Popup>
              ) : null}
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
