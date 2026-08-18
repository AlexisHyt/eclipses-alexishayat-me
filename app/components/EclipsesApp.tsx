"use client";

import { useEffect, useState, useTransition } from "react";
import {
  type EclipseWithPath,
  fetchEclipsesForLocation,
  fetchGlobalTotalEclipsesPage,
} from "@/app/actions/eclipses";
import { useI18n } from "@/app/i18n/context";
import EclipseCard from "./EclipseCard";
import type { Location } from "./LocationPicker";

type ViewMode = "local" | "global";

interface Props {
  location: Location | null;
}

const GLOBAL_PAGE_SIZE = 10;

export default function EclipsesApp({ location }: Props) {
  const { t } = useI18n();
  const [mode, setMode] = useState<ViewMode>("local");
  const [localEclipses, setLocalEclipses] = useState<EclipseWithPath[] | null>(
    null,
  );
  const [globalEclipses, setGlobalEclipses] = useState<EclipseWithPath[]>([]);
  const [globalNextCursorISO, setGlobalNextCursorISO] = useState<string | null>(
    null,
  );
  const [hasLoadedGlobal, setHasLoadedGlobal] = useState(false);
  // Keyed rather than stored as text, so a language switch retranslates it.
  const [errorKey, setErrorKey] = useState<"local" | "global" | null>(null);
  const [isPending, startTransition] = useTransition();

  const eclipses = mode === "local" ? localEclipses : globalEclipses;
  const hasResolvedResults =
    mode === "local" ? localEclipses !== null : hasLoadedGlobal;

  const lat = location?.lat ?? null;
  const lng = location?.lng ?? null;

  useEffect(() => {
    if (lat === null || lng === null) {
      setLocalEclipses(null);
      return;
    }

    setErrorKey(null);
    startTransition(async () => {
      try {
        const data = await fetchEclipsesForLocation(lat, lng);
        setLocalEclipses(data);
      } catch (e) {
        setErrorKey("local");
        console.error(e);
      }
    });
  }, [lat, lng]);

  async function loadGlobalEclipses(afterISO: string | null, append: boolean) {
    const page = await fetchGlobalTotalEclipsesPage(afterISO, GLOBAL_PAGE_SIZE);
    setGlobalNextCursorISO(page.nextCursorISO);
    setHasLoadedGlobal(true);
    setGlobalEclipses((current) =>
      append ? [...current, ...page.eclipses] : page.eclipses,
    );
  }

  function handleModeChange(nextMode: ViewMode) {
    setMode(nextMode);
    setErrorKey(null);

    if (nextMode === "global" && !hasLoadedGlobal) {
      startTransition(async () => {
        try {
          await loadGlobalEclipses(null, false);
        } catch (e) {
          setErrorKey("global");
          console.error(e);
        }
      });
    }
  }

  function handleLoadMore() {
    if (globalNextCursorISO === null) return;

    setErrorKey(null);
    startTransition(async () => {
      try {
        await loadGlobalEclipses(globalNextCursorISO, true);
      } catch (e) {
        setErrorKey("global");
        console.error(e);
      }
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40">
          {t.eclipses.modeTitle}
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
            {t.eclipses.modeLocal}
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
            {t.eclipses.modeGlobal}
          </button>
        </div>
      </section>

      {mode === "global" && (
        <section className="rounded-2xl border border-white/8 bg-white/3 px-5 py-4 text-sm text-white/55">
          {t.eclipses.globalNoteBefore}
          <strong className="text-white">{t.eclipses.globalNoteStrong}</strong>
          {t.eclipses.globalNoteAfter}
        </section>
      )}

      {mode === "global" && hasLoadedGlobal && globalEclipses.length > 0 && (
        <div className="text-xs text-white/35">
          {t.eclipses.batchNote(GLOBAL_PAGE_SIZE)}
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

      {!isPending && errorKey !== null && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-400">
          {errorKey === "local"
            ? t.eclipses.errorLocal
            : t.eclipses.errorGlobal}
        </div>
      )}

      {!isPending &&
        hasResolvedResults &&
        eclipses &&
        eclipses.length === 0 && (
          <div className="rounded-xl border border-white/8 bg-white/3 px-5 py-8 text-center text-sm text-white/40">
            {mode === "local" ? t.eclipses.emptyLocal : t.eclipses.emptyGlobal}
          </div>
        )}

      {!isPending && hasResolvedResults && eclipses && eclipses.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40">
            {mode === "local"
              ? t.eclipses.countLocal(eclipses.length)
              : t.eclipses.countGlobal(eclipses.length)}
          </h2>
          <div className="flex flex-col gap-2">
            {eclipses.map((e, i) => (
              <EclipseCard
                key={`${mode}-${e.peakISO}`}
                eclipse={e}
                index={i}
                userLat={mode === "local" ? lat : null}
                userLng={mode === "local" ? lng : null}
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
              {isPending ? t.eclipses.loading : t.eclipses.loadMore}
            </button>
          )}
          <p className="text-xs text-white/25 text-center pt-2">
            {t.eclipses.accuracy}
          </p>
        </section>
      )}

      {!isPending && mode === "local" && !eclipses && errorKey === null && (
        <div className="rounded-xl border border-dashed border-white/10 px-5 py-10 text-center text-sm text-white/30">
          {t.eclipses.pickLocation}
        </div>
      )}

      {!isPending &&
        mode === "global" &&
        !hasLoadedGlobal &&
        errorKey === null && (
          <div className="rounded-xl border border-dashed border-white/10 px-5 py-10 text-center text-sm text-white/30">
            {t.eclipses.pickGlobal}
          </div>
        )}
    </div>
  );
}
