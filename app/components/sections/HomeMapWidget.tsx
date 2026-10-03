"use client";

import { useEffect, useMemo, useState } from "react";
import {
    CircleMarker,
    GeoJSON,
    MapContainer,
    Marker,
    TileLayer,
    Tooltip,
    useMap,
    useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import type { FeatureCollection } from "geojson";

const ASHOKA_GARDEN: [number, number] = [23.25908905280885, 77.43162935585873];
const ROSHANPURA_NEW_MARKET: [number, number] = [23.23722663395946, 77.40103730441062];
const INDIA_CENTER: [number, number] = [22.5, 78.96];
// India bounding box — restricts pan and min zoom
const INDIA_BOUNDS: L.LatLngBoundsExpression = [[6.5, 68.0], [37.5, 97.5]];
const SATELLITE_ZOOM = 16;  // satellite only when very close in

const INDIA_GEOJSON_URL =
    "https://raw.githubusercontent.com/geohacker/india/master/country/india.geojson";

function FlyToMarker({
    position,
    icon,
    flyZoom,
    label,
}: {
    position: [number, number];
    icon: L.Icon;
    flyZoom: number;
    label: string;
}) {
    const map = useMap();
    return (
        <Marker
            position={position}
            icon={icon}
            eventHandlers={{
                click: () => {
                    map.flyTo(position, flyZoom, { duration: 1.2 });
                },
            }}
        >
            <Tooltip direction="top" offset={[0, -18]} opacity={1}>
                {label}
            </Tooltip>
        </Marker>
    );
}

function ZoomTracker({ onZoom }: { onZoom: (z: number) => void }) {
    useMapEvents({ zoomend: (e) => onZoom((e.target as L.Map).getZoom()) });
    return null;
}

function InMapZoomControls() {
    const map = useMap();

    return (
        <div className="pointer-events-none absolute bottom-3 right-3 z-1000 flex flex-col gap-2">
            <button
                type="button"
                onClick={() => map.zoomIn()}
                aria-label="Zoom in"
                className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-md border border-[#cfd8cf] bg-white text-[20px] leading-none text-[#123b16] shadow-sm"
            >
                +
            </button>
            <button
                type="button"
                onClick={() => map.zoomOut()}
                aria-label="Zoom out"
                className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-md border border-[#cfd8cf] bg-white text-[20px] leading-none text-[#123b16] shadow-sm"
            >
                -
            </button>
        </div>
    );
}

function MarkerWaves({ position }: { position: [number, number] }) {
    return (
        <>
            <CircleMarker
                center={position}
                radius={24}
                pathOptions={{
                    className: "algae-wave",
                    color: "#12a61a",
                    weight: 1.5,
                    fillColor: "#12a61a",
                    fillOpacity: 0.12,
                }}
                interactive={false}
            />
            <CircleMarker
                center={position}
                radius={24}
                pathOptions={{
                    className: "algae-wave algae-wave-delayed",
                    color: "#12a61a",
                    weight: 1.5,
                    fillColor: "#12a61a",
                    fillOpacity: 0.12,
                }}
                interactive={false}
            />
        </>
    );
}

export default function HomeMapWidget() {
    const [zoom, setZoom] = useState(4);
    const [isDark, setIsDark] = useState(false);
    const [indiaGeoJson, setIndiaGeoJson] = useState<FeatureCollection | null>(null);

    const algaeIcon = useMemo(
        () =>
            L.icon({
                iconUrl: "/Icon.png",
                iconSize: [47, 64],
                iconAnchor: [24, 32],
            }),
        [],
    );

    useEffect(() => {
        fetch(INDIA_GEOJSON_URL)
            .then((r) => r.json())
            .then((data: FeatureCollection) => setIndiaGeoJson(data))
            .catch(() => {/* non-fatal – map works without boundary */ });
    }, []);

    const isSatellite = zoom >= SATELLITE_ZOOM;

    const streetTile = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
    const satelliteTile =
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

    const indiaStyle = {
        color: isDark ? "#3edd5a" : "#12A61A",
        weight: 2,
        fillColor: isDark ? "#1a3d1e" : "#e6f5e8",
        fillOpacity: 0.45,
    };

    return (
        <div className="relative h-105 w-full md:h-130">
            <MapContainer
                key="algaetree-india-map"
                center={INDIA_CENTER}
                zoom={4}
                minZoom={4}
                maxZoom={18}
                maxBounds={INDIA_BOUNDS}
                maxBoundsViscosity={1.0}
                scrollWheelZoom={false}
                touchZoom={true}
                doubleClickZoom={false}
                boxZoom={false}
                keyboard={false}
                zoomControl={false}
                attributionControl
                className={`h-full w-full ${isDark ? "map-dark" : ""}`}
                style={{ background: isDark ? "#1a1f1a" : "#f0f0f0", touchAction: "none" }}
            >
                <ZoomTracker onZoom={setZoom} />
                <InMapZoomControls />

                <TileLayer
                    key={isSatellite ? "satellite" : "street"}
                    attribution={isSatellite ? "Tiles &copy; Esri" : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}
                    url={isSatellite ? satelliteTile : streetTile}
                />

                {indiaGeoJson && !isSatellite && (
                    <GeoJSON data={indiaGeoJson} style={indiaStyle} />
                )}

                {
                    <>
                        <MarkerWaves position={ASHOKA_GARDEN} />
                        <MarkerWaves position={ROSHANPURA_NEW_MARKET} />
                        <FlyToMarker
                            position={ASHOKA_GARDEN}
                            icon={algaeIcon}
                            flyZoom={18}
                            label="Ashoka Garden"
                        />
                        <FlyToMarker
                            position={ROSHANPURA_NEW_MARKET}
                            icon={algaeIcon}
                            flyZoom={18}
                            label="Roshanpura New Market"
                        />
                    </>
                }
            </MapContainer>

            {/* Top-left: AlgaeTree Network branding */}
            <div
                className="pointer-events-none absolute left-3 top-3 z-1000 flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 shadow-lg backdrop-blur-sm"
                style={{ background: isDark ? "rgba(20,30,20,0.82)" : "rgba(255,255,255,0.88)" }}
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/LOGO.png" alt="AlgaeTree" className="h-7 w-7 rounded-full object-contain" />
                <span
                    className="font-space-grotesk text-sm font-semibold tracking-tight"
                    style={{ color: isDark ? "#d4f5d8" : "#0f3d14" }}
                >
                    AlgaeTree Network
                </span>
            </div>

            {/* Top-right: dark/light toggle */}
            <button
                onClick={() => setIsDark((v) => !v)}
                aria-label="Toggle dark map"
                className="absolute right-3 top-3 z-1000 flex h-9 w-9 items-center justify-center rounded-full shadow-lg backdrop-blur-sm transition-colors"
                style={{ background: isDark ? "rgba(20,30,20,0.82)" : "rgba(255,255,255,0.88)" }}
            >
                {isDark ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d4f5d8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                        <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                    </svg>
                ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0f3d14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                )}
            </button>
        </div>
    );
}
