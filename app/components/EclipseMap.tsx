"use client";

import L from "leaflet";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { PathPoint } from "@/lib/eclipse-path";
import type { EclipseType } from "@/lib/eclipses";

// Fix default marker icons (Leaflet + bundler issue)
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface Props {
  userLat?: number | null;
  userLng?: number | null;
  pathPoints: PathPoint[];
  maxLat: number | null;
  maxLng: number | null;
  eclipseType: EclipseType;
}

const TYPE_COLORS: Record<EclipseType, string> = {
  Total: "#ef4444", // red-500
  Annular: "#f97316", // orange-500
  Partial: "#eab308", // yellow-500
};

function splitAtDateline(pathPoints: PathPoint[]): PathPoint[][] {
  if (pathPoints.length < 2) return [pathPoints];

  const segments: PathPoint[][] = [];
  let currentSegment: PathPoint[] = [pathPoints[0]];

  for (let i = 1; i < pathPoints.length; i++) {
    const previous = pathPoints[i - 1];
    const current = pathPoints[i];
    const lngJump = Math.abs(current.lng - previous.lng);

    if (lngJump > 180) {
      if (currentSegment.length > 1) {
        segments.push(currentSegment);
      }
      currentSegment = [current];
      continue;
    }

    currentSegment.push(current);
  }

  if (currentSegment.length > 1) {
    segments.push(currentSegment);
  }

  return segments;
}

export default function EclipseMap({
  userLat,
  userLng,
  pathPoints,
  maxLat,
  maxLng,
  eclipseType,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const hasUserLocation = userLat != null && userLng != null;
    const initialCenter = hasUserLocation
      ? ([userLat, userLng] as [number, number])
      : maxLat !== null && maxLng !== null
        ? ([maxLat, maxLng] as [number, number])
        : pathPoints.length > 0
          ? ([pathPoints[0].lat, pathPoints[0].lng] as [number, number])
          : ([0, 0] as [number, number]);

    const map = L.map(containerRef.current, {
      center: initialCenter,
      zoom: 3,
      zoomControl: false,
      scrollWheelZoom: false,
      attributionControl: false,
    });
    mapRef.current = map;

    // Dark tile layer (CartoDB Dark Matter)
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        subdomains: "abcd",
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
      },
    ).addTo(map);

    // Attribution (small, dark)
    L.control
      .attribution({ prefix: false, position: "bottomright" })
      .addTo(map);

    const color = TYPE_COLORS[eclipseType];

    // Draw NASA center line with dateline-safe segments.
    if (pathPoints && pathPoints.length > 1) {
      const segments = splitAtDateline(pathPoints);
      for (const segment of segments) {
        const latlngs = segment.map(
          (point) => [point.lat, point.lng] as [number, number],
        );
        L.polyline(latlngs, {
          color,
          weight: 3,
          opacity: 0.9,
        }).addTo(map);
      }
    }

    const boundsPoints: [number, number][] = [
      ...pathPoints.map((point) => [point.lat, point.lng] as [number, number]),
    ];

    if (hasUserLocation) {
      const userPosition: [number, number] = [userLat, userLng];
      const userIcon = L.divIcon({
        html: `<div style="width:10px;height:10px;border-radius:50%;background:#818cf8;border:2px solid #fff;box-shadow:0 0 6px #818cf8"></div>`,
        className: "",
        iconSize: [10, 10],
        iconAnchor: [5, 5],
      });
      L.marker(userPosition, { icon: userIcon })
        .bindTooltip("Votre position", {
          direction: "top",
          className: "eclipse-tooltip",
        })
        .addTo(map);

      boundsPoints.unshift(userPosition);
    }

    if (maxLat !== null && maxLng !== null && pathPoints.length === 0) {
      boundsPoints.push([maxLat, maxLng]);
    }

    if (boundsPoints.length > 1) {
      map.fitBounds(boundsPoints, {
        padding: [20, 20],
        maxZoom: 5,
      });
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [userLat, userLng, pathPoints, maxLat, maxLng, eclipseType]);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-lg overflow-hidden"
      style={{ height: 220 }}
    />
  );
}
