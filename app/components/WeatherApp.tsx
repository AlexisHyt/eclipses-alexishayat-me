"use client";

import { useEffect, useState, useTransition } from "react";
import { fetchWeather } from "@/app/actions/weather";
import { formatUtcOffset } from "@/app/components/formatters";
import { useFormatters, useI18n } from "@/app/i18n/context";
import type {
  ForecastDay,
  WeatherReport,
  WeatherResult,
  WeatherSlice,
} from "@/lib/weather";
import type { Location } from "./LocationPicker";
import WeatherIcon from "./WeatherIcon";

interface Props {
  location: Location | null;
}

/** A day carries no clock time: noon keeps it on the right day everywhere. */
function dayISO(date: string): string {
  return `${date}T12:00:00Z`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/4 px-3 py-2">
      <div className="mb-0.5 text-white/40">{label}</div>
      <div className="font-mono text-white/80">{value}</div>
    </div>
  );
}

/** Current conditions, as a single wide card. */
function CurrentCard({
  report,
  placeName,
}: {
  report: WeatherReport;
  placeName: string;
}) {
  const { t } = useI18n();
  const fmt = useFormatters();
  const { current } = report;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40">
        {t.weather.nowAt(placeName)}
      </h2>

      <div className="rounded-2xl border border-white/8 bg-white/3 px-5 py-5 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          <WeatherIcon
            code={current.condition.icon}
            label={current.condition.description}
            className="h-20 w-20 shrink-0"
          />

          <div className="min-w-0 flex-1">
            <div className="text-4xl font-semibold tracking-tight text-white">
              {fmt.temperature(current.temp)}
            </div>
            <p className="mt-1 text-sm text-white/70 first-letter:uppercase">
              {current.condition.description}
            </p>
            <p className="mt-0.5 text-xs text-white/40">
              {t.weather.feelsLike(fmt.temperature(current.feelsLike))}
              {report.todayMin !== null && report.todayMax !== null && (
                <>
                  {" · "}
                  {t.weather.todayRange(
                    fmt.temperature(report.todayMin),
                    fmt.temperature(report.todayMax),
                  )}
                </>
              )}
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-1 text-xs text-white/50">
            {current.sunriseISO !== null && (
              <span>
                ☀️ {t.weather.sunrise} :{" "}
                <span className="font-mono text-white/75">
                  {fmt.timeAtOffset(current.sunriseISO, report.utcOffsetSec)}
                </span>
              </span>
            )}
            {current.sunsetISO !== null && (
              <span>
                🌙 {t.weather.sunset} :{" "}
                <span className="font-mono text-white/75">
                  {fmt.timeAtOffset(current.sunsetISO, report.utcOffsetSec)}
                </span>
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
          <Stat
            label={t.weather.wind}
            value={`${fmt.speed(current.windSpeedKmh)} · ${fmt.compass(current.windDeg)}`}
          />
          <Stat
            label={t.weather.humidity}
            value={fmt.percent(current.humidity / 100)}
          />
          <Stat
            label={t.weather.pressure}
            value={fmt.pressure(current.pressure)}
          />
          <Stat
            label={t.weather.dewPoint}
            value={fmt.temperature(current.dewPoint)}
          />
          <Stat
            label={t.weather.clouds}
            value={fmt.percent(current.clouds / 100)}
          />
          {current.visibilityKm !== null && (
            <Stat
              label={t.weather.visibility}
              value={fmt.km(current.visibilityKm)}
            />
          )}
          {current.windGustKmh !== null && (
            <Stat
              label={t.weather.gust}
              value={fmt.speed(current.windGustKmh)}
            />
          )}
        </div>
      </div>
    </section>
  );
}

/** One three hour slot of the current day, as a chip in the scrolling strip. */
function SliceChip({
  slice,
  offsetSec,
}: {
  slice: WeatherSlice;
  offsetSec: number;
}) {
  const fmt = useFormatters();

  return (
    <li className="flex w-20 shrink-0 flex-col items-center gap-1 rounded-xl border border-white/8 bg-white/3 px-2 py-3">
      <span className="font-mono text-xs text-white/50">
        {fmt.timeAtOffset(slice.timeISO, offsetSec)}
      </span>
      <WeatherIcon
        code={slice.condition.icon}
        label={slice.condition.description}
        className="h-9 w-9"
      />
      <span className="text-sm font-medium text-white/90">
        {fmt.temperature(slice.temp)}
      </span>
      <span
        className={`text-[11px] ${slice.pop > 0.1 ? "text-sky-300/80" : "text-white/25"}`}
      >
        💧 {fmt.percent(slice.pop)}
      </span>
      <span className="text-[11px] text-white/30">
        {fmt.speed(slice.windSpeedKmh)}
      </span>
    </li>
  );
}

/**
 * One forecast day, described by its evening. The temperature bar places the
 * day's range inside the range of the whole week, so a mild day reads as mild
 * at a glance.
 */
function DayRow({
  day,
  weekMin,
  weekMax,
  offsetSec,
}: {
  day: ForecastDay;
  weekMin: number;
  weekMax: number;
  offsetSec: number;
}) {
  const { t } = useI18n();
  const fmt = useFormatters();
  const { evening } = day;
  const span = Math.max(weekMax - weekMin, 1);
  const left = ((day.tempMin - weekMin) / span) * 100;
  const width = Math.max(((day.tempMax - day.tempMin) / span) * 100, 4);

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/3 px-5 py-4 transition hover:border-white/15 sm:flex-row sm:items-center sm:gap-5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <WeatherIcon
          code={evening.condition.icon}
          label={evening.condition.description}
          className="h-10 w-10 shrink-0"
        />
        <div className="min-w-0">
          <div className="text-sm font-medium capitalize text-white/90">
            {fmt.shortDate(dayISO(day.date))}
          </div>
          <p className="truncate text-xs text-white/50 first-letter:uppercase">
            {evening.condition.description}
          </p>
          <p className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-white/35">
            <span className="font-mono">
              {t.weather.evening} {fmt.timeAtOffset(evening.timeISO, offsetSec)}
              {" · "}
              {fmt.temperature(evening.temp)}
            </span>
            <span>
              💧 {fmt.percent(evening.pop)}
              {evening.precipitationMm !== null &&
                evening.precipitationMm > 0 && (
                  <> · {fmt.millimetres(evening.precipitationMm)}</>
                )}
            </span>
            <span>
              💨 {fmt.speed(evening.windSpeedKmh)}{" "}
              {fmt.compass(evening.windDeg)}
            </span>
          </p>
        </div>
      </div>

      <div className="flex w-full shrink-0 items-center gap-3 sm:w-64">
        <span className="w-12 shrink-0 text-right font-mono text-xs text-white/45">
          {fmt.temperature(day.tempMin)}
        </span>
        <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/8">
          <div
            className="absolute inset-y-0 rounded-full bg-gradient-to-r from-sky-400/70 to-amber-400/70"
            style={{ left: `${left}%`, width: `${width}%` }}
          />
        </div>
        <span className="w-12 shrink-0 font-mono text-xs text-white/85">
          {fmt.temperature(day.tempMax)}
        </span>
      </div>
    </li>
  );
}

export default function WeatherApp({ location }: Props) {
  const { locale, t } = useI18n();
  const [result, setResult] = useState<WeatherResult | null>(null);
  const [failed, setFailed] = useState(false);
  const [isPending, startTransition] = useTransition();

  const lat = location?.lat ?? null;
  const lng = location?.lng ?? null;

  useEffect(() => {
    if (lat === null || lng === null) {
      setResult(null);
      return;
    }

    setFailed(false);
    startTransition(async () => {
      try {
        setResult(await fetchWeather(lat, lng, locale));
      } catch (e) {
        setFailed(true);
        console.error(e);
      }
    });
  }, [lat, lng, locale]);

  if (isPending) {
    return (
      <div className="flex flex-col gap-3">
        <div className="h-44 animate-pulse rounded-2xl bg-white/4" />
        {(["s1", "s2", "s3", "s4", "s5"] as const).map((id, i) => (
          <div
            key={id}
            className="h-20 animate-pulse rounded-2xl bg-white/4"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
    );
  }

  if (failed || result?.status === "unavailable") {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-400">
        {t.weather.errorUnavailable}
      </div>
    );
  }

  if (result?.status === "unauthorized") {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-5 py-4 text-sm text-amber-300">
        {t.weather.errorUnauthorized}
      </div>
    );
  }

  if (result === null) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 px-5 py-10 text-center text-sm text-white/30">
        {t.weather.pickLocation}
      </div>
    );
  }

  const { report } = result;
  const temperatures = report.days.flatMap((day) => [day.tempMin, day.tempMax]);
  const weekMin = Math.min(...temperatures);
  const weekMax = Math.max(...temperatures);

  return (
    <div className="flex flex-col gap-8">
      <CurrentCard
        report={report}
        placeName={
          location?.label ?? report.placeName ?? t.weather.yourLocation
        }
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40">
          {t.weather.todayHours}
        </h2>
        {report.todaySlices.length > 0 ? (
          <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
            {report.todaySlices.map((slice) => (
              <SliceChip
                key={slice.timeISO}
                slice={slice}
                offsetSec={report.utcOffsetSec}
              />
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-white/8 bg-white/3 px-5 py-4 text-sm text-white/40">
            {t.weather.noSlices}
          </p>
        )}
      </section>

      {report.days.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40">
            {t.weather.daysTitle(report.days.length)}
          </h2>
          <ul className="flex flex-col gap-2">
            {report.days.map((day) => (
              <DayRow
                key={day.date}
                day={day}
                weekMin={weekMin}
                weekMax={weekMax}
                offsetSec={report.utcOffsetSec}
              />
            ))}
          </ul>
          <p className="text-xs text-white/25">{t.weather.eveningNote}</p>
        </section>
      )}

      <p className="text-xs text-white/25">
        {t.weather.timeZoneNote(formatUtcOffset(report.utcOffsetSec))}
      </p>

      <p className="text-center text-xs text-white/25">{t.weather.credit}</p>
    </div>
  );
}
