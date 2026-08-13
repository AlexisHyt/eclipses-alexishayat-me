"use client";

import { useState, useTransition } from "react";
import {
  type EclipseWithPath,
  fetchEclipsesForLocation,
} from "@/app/actions/eclipses";
import EclipseCard from "./EclipseCard";
import LocationPicker, { type Location } from "./LocationPicker";

export default function EclipsesApp() {
  const [location, setLocation] = useState<Location | null>(null);
  const [eclipses, setEclipses] = useState<EclipseWithPath[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleLocationChange(loc: Location) {
    setLocation(loc);
    setError(null);
    startTransition(async () => {
      try {
        const data = await fetchEclipsesForLocation(loc.lat, loc.lng);
        setEclipses(data);
      } catch (e) {
        setError("Erreur lors du calcul des éclipses. Veuillez réessayer.");
        console.error(e);
      }
    });
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Location picker */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40">
          Votre emplacement
        </h2>
        <LocationPicker
          onLocationChange={handleLocationChange}
          currentLocation={location}
        />
      </section>

      {/* Results */}
      {isPending && (
        <div className="flex flex-col gap-3">
          {(["s1", "s2", "s3", "s4", "s5"] as const).map((id, i) => (
            <div
              key={id}
              className="h-18 rounded-2xl bg-white/4 animate-pulse"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      )}

      {!isPending && error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {!isPending && eclipses && eclipses.length === 0 && (
        <div className="rounded-xl border border-white/8 bg-white/3 px-5 py-8 text-center text-sm text-white/40">
          Aucune éclipse solaire visible depuis cet emplacement dans les années
          à venir.
        </div>
      )}

      {!isPending && eclipses && eclipses.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40">
            {eclipses.length} prochaine{eclipses.length > 1 ? "s" : ""} éclipse
            {eclipses.length > 1 ? "s" : ""} visibles
          </h2>
          <div className="flex flex-col gap-2">
            {eclipses.map((e, i) => (
              <EclipseCard
                key={e.peakISO}
                eclipse={e}
                index={i}
                userLat={location?.lat ?? 0}
                userLng={location?.lng ?? 0}
              />
            ))}
          </div>
          <p className="text-xs text-white/25 text-center pt-2">
            Calculs basés sur les éphémérides VSOP87 via astronomy-engine ·
            Précision ±1 minute
          </p>
        </section>
      )}

      {!isPending && !eclipses && !error && (
        <div className="rounded-xl border border-dashed border-white/10 px-5 py-10 text-center text-sm text-white/30">
          Sélectionnez un emplacement pour voir les prochaines éclipses
          solaires.
        </div>
      )}
    </div>
  );
}
