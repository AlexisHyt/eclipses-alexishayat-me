"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface Location {
  lat: number;
  lng: number;
  label: string;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    suburb?: string;
    county?: string;
    state_district?: string;
    state?: string;
    municipality?: string;
  };
}

interface Props {
  onLocationChange: (location: Location) => void;
  currentLocation: Location | null;
}

export default function LocationPicker({
  onLocationChange,
  currentLocation,
}: Props) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchNominatim = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    setLoadingSuggestions(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&accept-language=fr&addressdetails=1`;
      const res = await fetch(url, {
        headers: { "Accept-Language": "fr" },
      });
      const data: NominatimResult[] = await res.json();
      setSuggestions(data);
      setShowSuggestions(true);
    } catch {
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  }, []);

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchNominatim(val), 350);
  }

  function extractCityLabel(result: NominatimResult): string {
    // Try to use structured address first
    if (result.address) {
      return (
        result.address.city ||
        result.address.town ||
        result.address.village ||
        result.address.municipality ||
        result.address.county ||
        result.address.state_district ||
        result.address.state ||
        result.address.suburb ||
        result.address.hamlet ||
        result.display_name.split(",")[0].trim()
      );
    }
    // Fallback: split display_name and find a reasonable city-level name
    const parts = result.display_name.split(",").map((p) => p.trim());
    return parts[0];
  }

  function handleSelectSuggestion(result: NominatimResult) {
    const cityLabel = extractCityLabel(result);
    setQuery(cityLabel);
    setShowSuggestions(false);
    setSuggestions([]);
    onLocationChange({
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      label: cityLabel,
    });
  }

  function handleUseMyPosition() {
    if (!navigator.geolocation) return;
    setLoadingGeo(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        // Reverse geocode
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&accept-language=fr&addressdetails=1`,
          );
          const data = (await res.json()) as NominatimResult;
          const cityLabel = extractCityLabel(data);
          setQuery(cityLabel);
          onLocationChange({ lat: latitude, lng: longitude, label: cityLabel });
        } catch {
          onLocationChange({
            lat: latitude,
            lng: longitude,
            label: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          });
        } finally {
          setLoadingGeo(false);
        }
      },
      () => setLoadingGeo(false),
      { timeout: 10000 },
    );
  }

  return (
    <div className="w-full max-w-2xl" ref={containerRef}>
      <div className="flex gap-2">
        {/* Search input */}
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={handleQueryChange}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder="Rechercher une ville ou une adresse…"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/40 outline-none ring-0 transition focus:border-indigo-400/60 focus:bg-white/8 focus:ring-1 focus:ring-indigo-400/40"
          />
          {loadingSuggestions && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-xs">
              ⏳
            </span>
          )}
          {/* Suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-50 mt-1 w-full rounded-xl border border-white/10 bg-[#0f0f1a] shadow-2xl overflow-hidden">
              {suggestions.map((r) => (
                <li key={r.place_id}>
                  <button
                    type="button"
                    onClick={() => handleSelectSuggestion(r)}
                    className="w-full px-4 py-2.5 text-left text-sm text-white/80 hover:bg-white/8 transition truncate"
                  >
                    {extractCityLabel(r)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Geolocation button */}
        <button
          type="button"
          onClick={handleUseMyPosition}
          disabled={loadingGeo}
          title="Utiliser ma position"
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 transition hover:bg-white/10 hover:border-white/20 disabled:opacity-50"
        >
          {loadingGeo ? (
            <span className="animate-spin text-base">⏳</span>
          ) : (
            <span className="text-base">📍</span>
          )}
          <span className="hidden sm:inline">Ma position</span>
        </button>
      </div>

      {currentLocation && (
        <p className="mt-2 text-xs text-white/40 truncate">
          {currentLocation.label}
        </p>
      )}
    </div>
  );
}
