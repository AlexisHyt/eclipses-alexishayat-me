"use client";

import { useEffect, useState, useTransition } from "react";
import { fetchTransitsForLocation } from "@/app/actions/transits";
import { useFormatters, useI18n } from "@/app/i18n/context";
import type {
  TransitContact,
  TransitEvent,
  TransitPlanet,
  TransitVisibility,
} from "@/lib/transits";
import type { Location } from "./LocationPicker";
import TransitDisc from "./TransitDisc";

interface Props {
  location: Location | null;
}

const PLANET_SYMBOL: Record<TransitPlanet, string> = {
  mercury: "☿",
  venus: "♀",
};

const PLANET_BADGE: Record<TransitPlanet, string> = {
  mercury: "bg-sky-500/20 text-sky-300 border border-sky-500/30",
  venus: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
};

const VISIBILITY_BADGE: Record<TransitVisibility, string> = {
  full: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25",
  partial: "bg-white/6 text-white/55 border border-white/12",
};

/** One of the three contacts, with the height of the Sun at that moment. */
function ContactCell({
  title,
  contact,
}: {
  title: string;
  contact: TransitContact;
}) {
  const { t } = useI18n();
  const fmt = useFormatters();

  return (
    <div className="rounded-lg bg-white/4 px-3 py-2">
      <div className="mb-0.5 text-white/40">{title}</div>
      <div className="font-mono text-white/80">
        {fmt.timeWithZone(contact.timeISO)}
      </div>
      <div className={contact.visible ? "text-white/40" : "text-white/25"}>
        {contact.visible
          ? t.transits.sunAt(
              contact.sunAltitude.toFixed(1),
              fmt.compass(contact.sunAzimuth),
            )
          : t.transits.sunBelow}
      </div>
    </div>
  );
}

function TransitCard({
  transit,
  index,
  fromISO,
}: {
  transit: TransitEvent;
  index: number;
  fromISO: string;
}) {
  const { t } = useI18n();
  const fmt = useFormatters();
  // The next transit is the one visitors came for: it opens on its own.
  const [open, setOpen] = useState(index === 0);
  const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const planetName = t.transits.planets[transit.planet];
  const silhouetteRatio = Math.round(
    transit.sunDiameterArcsec / transit.planetDiameterArcsec,
  );

  return (
    <article className="overflow-hidden rounded-2xl border border-white/8 bg-white/3 backdrop-blur-sm transition hover:border-white/15">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer items-start gap-4 px-5 py-4 text-left"
      >
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/6 text-xs font-semibold text-white/50">
          {index + 1}
        </span>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${PLANET_BADGE[transit.planet]}`}
            >
              <span aria-hidden>{PLANET_SYMBOL[transit.planet]}</span>
              {planetName}
            </span>
            <span className="text-sm font-medium capitalize text-white/90">
              {fmt.fullDate(transit.peak.timeISO)}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${VISIBILITY_BADGE[transit.visibility]}`}
            >
              {t.transits.visibility[transit.visibility]}
            </span>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/50">
            <span>{fmt.inYears(transit.peak.timeISO, fromISO)}</span>
            <span>
              ⏱ {t.transits.duration} :{" "}
              <span className="text-white/70">
                {fmt.durationHM(transit.durationMin * 60)}
              </span>
            </span>
            <span>
              👁 {t.transits.visibleWindow} :{" "}
              <span className="text-white/70">
                {fmt.durationHM(transit.visibleMinutes * 60)}
              </span>
            </span>
          </div>
        </div>

        <svg
          aria-hidden="true"
          className={`mt-1 h-4 w-4 shrink-0 text-white/30 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <div className="flex flex-col gap-4 border-t border-white/6 px-5 pb-5 pt-4">
          <p className="text-xs text-white/35">
            {t.transits.timeZoneNote(browserTimeZone)}
          </p>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
            <div className="flex shrink-0 flex-col items-center gap-2 sm:w-52">
              <TransitDisc
                separationArcmin={transit.separationArcmin}
                sunRadiusArcmin={transit.sunRadiusArcmin}
                planetDiameterArcsec={transit.planetDiameterArcsec}
                sunDiameterArcsec={transit.sunDiameterArcsec}
                label={t.transits.discLabel(planetName)}
              />
              <p className="text-[10px] leading-snug text-white/25">
                {t.transits.discCaption}
              </p>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
                <ContactCell
                  title={t.transits.contactStart}
                  contact={transit.start}
                />
                <ContactCell
                  title={t.transits.contactPeak}
                  contact={transit.peak}
                />
                <ContactCell
                  title={t.transits.contactFinish}
                  contact={transit.finish}
                />
              </div>

              <div className="rounded-lg border border-white/8 bg-white/4 px-3 py-2 text-xs">
                <div className="mb-0.5 text-white/40">
                  {t.transits.visibleWindow}
                </div>
                <div className="font-mono text-white/80">
                  {fmt.time(transit.visibleStartISO)} –{" "}
                  {fmt.timeWithZone(transit.visibleEndISO)}
                </div>
                <div className="text-white/40">
                  {t.transits.visibleFor(
                    fmt.durationHM(transit.visibleMinutes * 60),
                  )}
                </div>
              </div>

              <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-xs text-white/50 sm:grid-cols-2">
                <div className="flex justify-between gap-2 sm:justify-start">
                  <dt>{t.transits.separation}</dt>
                  <dd className="font-mono text-white/70">
                    {transit.separationArcmin.toFixed(2)}′
                  </dd>
                </div>
                <div className="flex justify-between gap-2 sm:justify-start">
                  <dt>{t.transits.sunDiameter}</dt>
                  <dd className="font-mono text-white/70">
                    {(transit.sunRadiusArcmin * 2).toFixed(1)}′
                  </dd>
                </div>
                <div className="flex justify-between gap-2 sm:col-span-2 sm:justify-start">
                  <dt>{t.transits.silhouette}</dt>
                  <dd className="font-mono text-white/70">
                    {transit.planetDiameterArcsec.toFixed(1)}″ ·{" "}
                    {t.transits.silhouetteRatio(silhouetteRatio)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

export default function TransitsApp({ location }: Props) {
  const { t } = useI18n();
  const [transits, setTransits] = useState<TransitEvent[] | null>(null);
  const [fromISO, setFromISO] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [isPending, startTransition] = useTransition();

  const lat = location?.lat ?? null;
  const lng = location?.lng ?? null;

  useEffect(() => {
    if (lat === null || lng === null) {
      setTransits(null);
      return;
    }

    const now = new Date().toISOString();
    setFailed(false);
    startTransition(async () => {
      try {
        setTransits(await fetchTransitsForLocation(lat, lng));
        setFromISO(now);
      } catch (e) {
        setFailed(true);
        console.error(e);
      }
    });
  }, [lat, lng]);

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-2xl border border-white/8 bg-white/3 px-5 py-4 text-sm text-white/55">
        {t.transits.introBefore}
        <strong className="text-white">{t.transits.introStrong}</strong>
        {t.transits.introAfter}
      </section>

      {isPending && (
        <div className="flex flex-col gap-3">
          {(["s1", "s2", "s3", "s4", "s5"] as const).map((id, i) => (
            <div
              key={id}
              className="h-18 animate-pulse rounded-2xl bg-white/4"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      )}

      {!isPending && failed && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-400">
          {t.transits.error}
        </div>
      )}

      {!isPending && !failed && transits === null && (
        <div className="rounded-xl border border-dashed border-white/10 px-5 py-10 text-center text-sm text-white/30">
          {t.transits.pickLocation}
        </div>
      )}

      {!isPending && transits !== null && transits.length === 0 && (
        <div className="rounded-xl border border-white/8 bg-white/3 px-5 py-8 text-center text-sm text-white/40">
          {t.transits.empty}
        </div>
      )}

      {!isPending && transits !== null && transits.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40">
            {t.transits.count(transits.length)}
          </h2>
          <p className="text-xs text-white/35">{t.transits.rarity}</p>

          <div className="mt-1 flex flex-col gap-2">
            {transits.map((transit, i) => (
              <TransitCard
                key={transit.peak.timeISO}
                transit={transit}
                index={i}
                fromISO={fromISO ?? transit.peak.timeISO}
              />
            ))}
          </div>

          <p className="pt-2 text-center text-xs text-white/25">
            {t.transits.credit(
              Intl.DateTimeFormat().resolvedOptions().timeZone,
            )}
          </p>
        </section>
      )}
    </div>
  );
}
