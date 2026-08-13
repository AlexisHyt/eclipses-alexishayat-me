"use client";

import { useState, useTransition } from "react";
import {
  type EclipseWithPath,
  fetchEclipsesForLocation,
  fetchGlobalTotalEclipsesPage,
} from "@/app/actions/eclipses";
import EclipseCard from "./EclipseCard";
import LocationPicker, { type Location } from "./LocationPicker";

type ViewMode = "local" | "global";

const GLOBAL_PAGE_SIZE = 10;

export default function EclipsesApp() {
  const [mode, setMode] = useState<ViewMode>("local");
  const [location, setLocation] = useState<Location | null>(null);
  const [localEclipses, setLocalEclipses] = useState<EclipseWithPath[] | null>(
    null,
  );
  const [globalEclipses, setGlobalEclipses] = useState<EclipseWithPath[]>([]);
  const [globalNextCursorISO, setGlobalNextCursorISO] = useState<string | null>(
    null,
  );
  const [hasLoadedGlobal, setHasLoadedGlobal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const eclipses = mode === "local" ? localEclipses : globalEclipses;
  const hasResolvedResults =
    mode === "local" ? localEclipses !== null : hasLoadedGlobal;

  async function loadGlobalEclipses(afterISO: string | null, append: boolean) {
    const page = await fetchGlobalTotalEclipsesPage(afterISO, GLOBAL_PAGE_SIZE);
    setGlobalNextCursorISO(page.nextCursorISO);
    setHasLoadedGlobal(true);
    setGlobalEclipses((current) =>
      append ? [...current, ...page.eclipses] : page.eclipses,
    );
  }

  function handleLocationChange(loc: Location) {
    setLocation(loc);
    setError(null);
    startTransition(async () => {
      try {
        const data = await fetchEclipsesForLocation(loc.lat, loc.lng);
        setLocalEclipses(data);
      } catch (e) {
        setError("Erreur lors du calcul des éclipses. Veuillez réessayer.");
        console.error(e);
      }
    });
  }

  function handleModeChange(nextMode: ViewMode) {
    setMode(nextMode);
    setError(null);

    if (nextMode === "global" && !hasLoadedGlobal) {
      startTransition(async () => {
        try {
          await loadGlobalEclipses(null, false);
        } catch (e) {
          setError("Erreur lors du chargement des éclipses mondiales.");
          console.error(e);
        }
      });
    }
  }

  function handleLoadMore() {
    if (globalNextCursorISO === null) return;

    setError(null);
    startTransition(async () => {
      try {
        await loadGlobalEclipses(globalNextCursorISO, true);
      } catch (e) {
        setError("Erreur lors du chargement des éclipses mondiales.");
        console.error(e);
      }
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40">
          Mode d&apos;exploration
        </h2>
        <div className="inline-flex w-full rounded-2xl border border-white/10 bg-white/4 p-1 sm:w-auto">
          <button
            type="button"
            onClick={() => handleModeChange("local")}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition sm:flex-none ${
              mode === "local"
                ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                : "text-white/65 hover:bg-white/6 hover:text-white"
            }`}
          >
            Local
          </button>
          <button
            type="button"
            onClick={() => handleModeChange("global")}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition sm:flex-none ${
              mode === "global"
                ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                : "text-white/65 hover:bg-white/6 hover:text-white"
            }`}
          >
            Monde · Totales
          </button>
        </div>
      </section>

      {mode === "local" ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40">
            Votre emplacement
          </h2>
          <LocationPicker
            onLocationChange={handleLocationChange}
            currentLocation={location}
          />
        </section>
      ) : (
        <section className="rounded-2xl border border-white/8 bg-white/3 px-5 py-4 text-sm text-white/55">
          Affiche les prochaines éclipses solaires{" "}
          <strong className="text-white">totales</strong>
          {" "}partout dans le monde, sans sélectionner de ville.
        </section>
      )}

      {mode === "global" && hasLoadedGlobal && globalEclipses.length > 0 && (
        <div className="text-xs text-white/35">
          Chargement progressif par lots de {GLOBAL_PAGE_SIZE} éclipses.
        </div>
      )}

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

      {!isPending &&
        hasResolvedResults &&
        eclipses &&
        eclipses.length === 0 && (
          <div className="rounded-xl border border-white/8 bg-white/3 px-5 py-8 text-center text-sm text-white/40">
            {mode === "local"
              ? "Aucune éclipse solaire visible depuis cet emplacement dans les années à venir."
              : "Aucune éclipse totale mondiale trouvée dans l'intervalle recherché."}
          </div>
        )}

      {!isPending && hasResolvedResults && eclipses && eclipses.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40">
            {mode === "local"
              ? `${eclipses.length} prochaine${eclipses.length > 1 ? "s" : ""} éclipse${eclipses.length > 1 ? "s" : ""} visible${eclipses.length > 1 ? "s" : ""}`
              : `${eclipses.length} éclipse${eclipses.length > 1 ? "s" : ""} totale${eclipses.length > 1 ? "s" : ""} chargée${eclipses.length > 1 ? "s" : ""}`}
          </h2>
          <div className="flex flex-col gap-2">
            {eclipses.map((e, i) => (
              <EclipseCard
                key={`${mode}-${e.peakISO}`}
                eclipse={e}
                index={i}
                userLat={mode === "local" ? (location?.lat ?? null) : null}
                userLng={mode === "local" ? (location?.lng ?? null) : null}
              />
            ))}
          </div>
          {mode === "global" && globalNextCursorISO && (
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={isPending}
              className="mt-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 transition hover:bg-white/10 hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Chargement…" : "Charger plus d'éclipses totales"}
            </button>
          )}
          <p className="text-xs text-white/25 text-center pt-2">
            Calculs basés sur les éphémérides VSOP87 via astronomy-engine ·
            Précision ±1 minute
          </p>
        </section>
      )}

      {!isPending && mode === "local" && !eclipses && !error && (
        <div className="rounded-xl border border-dashed border-white/10 px-5 py-10 text-center text-sm text-white/30">
          Sélectionnez un emplacement pour voir les prochaines éclipses
          solaires.
        </div>
      )}

      {!isPending && mode === "global" && !hasLoadedGlobal && !error && (
        <div className="rounded-xl border border-dashed border-white/10 px-5 py-10 text-center text-sm text-white/30">
          Chargez la vue mondiale pour explorer les prochaines éclipses totales.
        </div>
      )}
    </div>
  );
}
