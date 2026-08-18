/**
 * Current weather and forecast, from the free OpenWeatherMap 2.5 endpoints:
 * `/weather` for the conditions right now, and `/forecast` for the five day
 * outlook, which comes as three hour slots.
 *
 * https://openweathermap.org/current
 * https://openweathermap.org/forecast5
 */

/** Language codes OpenWeatherMap is asked to translate its descriptions into. */
export type WeatherLanguage = "fr" | "en";

export interface WeatherCondition {
  /** OpenWeatherMap condition id, e.g. 500 for light rain */
  id: number;
  /** Human sentence, already translated by the API */
  description: string;
  /** Icon code, e.g. `04n`; the trailing letter tells day from night */
  icon: string;
}

export interface CurrentWeather {
  /** Instant the observation describes (ISO, UTC) */
  timeISO: string;
  temp: number;
  feelsLike: number;
  /** Percentage, 0–100 */
  humidity: number;
  /** Hectopascals at sea level */
  pressure: number;
  /** Derived from the temperature and the humidity, see `dewPoint` */
  dewPoint: number;
  /** Cloud cover, in percent */
  clouds: number;
  /** Horizontal visibility in kilometres, capped at 10 by the provider */
  visibilityKm: number | null;
  windSpeedKmh: number;
  windGustKmh: number | null;
  /** Direction the wind blows *from*, in degrees from the north */
  windDeg: number;
  sunriseISO: string | null;
  sunsetISO: string | null;
  condition: WeatherCondition;
}

/** One three hour slot of the forecast. */
export interface WeatherSlice {
  /** Start of the slot (ISO, UTC) */
  timeISO: string;
  /** Hour of the day the slot starts at, at the forecast location */
  localHour: number;
  temp: number;
  feelsLike: number;
  /** Probability of precipitation over the slot, 0–1 */
  pop: number;
  /** Rain or melted snow expected during the slot, in millimetres */
  precipitationMm: number | null;
  windSpeedKmh: number;
  windDeg: number;
  condition: WeatherCondition;
}

export interface ForecastDay {
  /** Calendar day at the forecast location, as `YYYY-MM-DD` */
  date: string;
  /** Coldest and warmest slot of that day */
  tempMin: number;
  tempMax: number;
  /** The evening slot, which stands for the day as a whole */
  evening: WeatherSlice;
}

export interface WeatherReport {
  /** Offset from UTC at the forecast location, in seconds */
  utcOffsetSec: number;
  /** Name of the place as OpenWeatherMap knows it */
  placeName: string;
  current: CurrentWeather;
  /** Slots left in the current local day, in chronological order */
  todaySlices: WeatherSlice[];
  /** Coldest and warmest slot left today, when any slot remains */
  todayMin: number | null;
  todayMax: number | null;
  /** The days that follow, each described by its evening slot */
  days: ForecastDay[];
}

/**
 * What the tab gets back: either a report, or the reason there is none. The
 * two failures are told apart because they call for different fixes — one is
 * the API key, the other is the network.
 */
export type WeatherResult =
  | { status: "ok"; report: WeatherReport }
  | { status: "unauthorized" }
  | { status: "unavailable" };

/**
 * How many days may follow today. The free forecast reaches five days out, so
 * its last day only holds an evening slot when the visitor comes late enough
 * in the day: the tab shows four or five rows depending on the hour.
 */
export const MAX_FORECAST_DAYS = 5;

/** Local hours a slot must fall in to stand for the evening of its day. */
const EVENING_WINDOW = { from: 15, to: 23 } as const;

/** Hour the evening is centred on, when a day offers several slots. */
const EVENING_HOUR = 18;

const CURRENT_ENDPOINT = "https://api.openweathermap.org/data/2.5/weather";
const FORECAST_ENDPOINT = "https://api.openweathermap.org/data/2.5/forecast";

/** The API is a hard dependency of the tab, so it is not given forever. */
const TIMEOUT_MS = 10_000;

interface OwmCondition {
  id?: number;
  description?: string;
  icon?: string;
}

interface OwmWind {
  speed?: number;
  deg?: number;
  gust?: number;
}

interface CurrentResponse {
  dt?: number;
  name?: string;
  timezone?: number;
  visibility?: number;
  main?: {
    temp?: number;
    feels_like?: number;
    pressure?: number;
    humidity?: number;
  };
  wind?: OwmWind;
  clouds?: { all?: number };
  sys?: { sunrise?: number; sunset?: number };
  weather?: OwmCondition[];
}

interface ForecastEntry {
  dt?: number;
  main?: { temp?: number; feels_like?: number };
  wind?: OwmWind;
  pop?: number;
  rain?: { "3h"?: number };
  snow?: { "3h"?: number };
  weather?: OwmCondition[];
}

interface ForecastResponse {
  list?: ForecastEntry[];
  city?: { name?: string; timezone?: number };
}

function round(value: number | undefined, decimals = 0): number {
  const factor = 10 ** decimals;
  return Math.round((value ?? 0) * factor) / factor;
}

/** Unix seconds to an ISO string, or `null` when the API omits the field. */
function toISO(seconds: number | undefined): string | null {
  return seconds === undefined ? null : new Date(seconds * 1000).toISOString();
}

/** The API reports wind in metres per second; km/h reads better on a card. */
function toKmh(metresPerSecond: number | undefined): number {
  return metresPerSecond === undefined ? 0 : Math.round(metresPerSecond * 3.6);
}

function toCondition(conditions: OwmCondition[] | undefined): WeatherCondition {
  const first = conditions?.[0];

  return {
    id: first?.id ?? 0,
    description: first?.description ?? "",
    icon: first?.icon ?? "01d",
  };
}

/**
 * Dew point in degrees Celsius, from the Magnus formula.
 *
 * The free endpoints do not report it, but it follows from the temperature and
 * the relative humidity to within a few tenths of a degree.
 */
export function dewPoint(tempCelsius: number, humidityPercent: number): number {
  const b = 17.62;
  const c = 243.12;
  const ratio = Math.min(Math.max(humidityPercent, 1), 100) / 100;
  const gamma = Math.log(ratio) + (b * tempCelsius) / (c + tempCelsius);

  return (c * gamma) / (b - gamma);
}

/** The calendar day an instant falls on, at the forecast location. */
function localDate(seconds: number, offsetSec: number): string {
  return new Date((seconds + offsetSec) * 1000).toISOString().slice(0, 10);
}

/** The hour of the day an instant falls on, at the forecast location. */
function localHour(seconds: number, offsetSec: number): number {
  return new Date((seconds + offsetSec) * 1000).getUTCHours();
}

function toCurrent(raw: CurrentResponse): CurrentWeather {
  const temp = round(raw.main?.temp, 1);
  const humidity = round(raw.main?.humidity);

  return {
    timeISO: toISO(raw.dt) ?? new Date().toISOString(),
    temp: Math.round(temp),
    feelsLike: round(raw.main?.feels_like),
    humidity,
    pressure: round(raw.main?.pressure),
    dewPoint: Math.round(dewPoint(temp, humidity)),
    clouds: round(raw.clouds?.all),
    visibilityKm:
      raw.visibility === undefined ? null : round(raw.visibility / 1000, 1),
    windSpeedKmh: toKmh(raw.wind?.speed),
    windGustKmh: raw.wind?.gust === undefined ? null : toKmh(raw.wind.gust),
    windDeg: round(raw.wind?.deg),
    sunriseISO: toISO(raw.sys?.sunrise),
    sunsetISO: toISO(raw.sys?.sunset),
    condition: toCondition(raw.weather),
  };
}

function toSlice(raw: ForecastEntry, offsetSec: number): WeatherSlice {
  const seconds = raw.dt ?? 0;
  const precipitation = raw.rain?.["3h"] ?? raw.snow?.["3h"];

  return {
    timeISO: new Date(seconds * 1000).toISOString(),
    localHour: localHour(seconds, offsetSec),
    temp: round(raw.main?.temp),
    feelsLike: round(raw.main?.feels_like),
    pop: round(raw.pop, 2),
    precipitationMm:
      precipitation === undefined ? null : round(precipitation, 1),
    windSpeedKmh: toKmh(raw.wind?.speed),
    windDeg: round(raw.wind?.deg),
    condition: toCondition(raw.weather),
  };
}

/**
 * The slot that best stands for the evening of a day: the one nearest 18:00
 * local, among those late enough to count as an evening.
 *
 * The last day of the window is usually cut short before the evening, in which
 * case it has no such slot; the day is then left out rather than described by
 * an unrepresentative morning.
 */
function eveningSlice(slices: WeatherSlice[]): WeatherSlice | null {
  const candidates = slices.filter(
    (slice) =>
      slice.localHour >= EVENING_WINDOW.from &&
      slice.localHour <= EVENING_WINDOW.to,
  );

  if (candidates.length === 0) return null;

  return candidates.reduce((best, slice) =>
    Math.abs(slice.localHour - EVENING_HOUR) <
    Math.abs(best.localHour - EVENING_HOUR)
      ? slice
      : best,
  );
}

/** Group the flat list of slots by the calendar day they belong to. */
function groupByDay(
  entries: ForecastEntry[],
  offsetSec: number,
): Map<string, WeatherSlice[]> {
  const days = new Map<string, WeatherSlice[]>();

  for (const entry of entries) {
    if (entry.dt === undefined) continue;

    const date = localDate(entry.dt, offsetSec);
    const slices = days.get(date);
    const slice = toSlice(entry, offsetSec);

    if (slices === undefined) {
      days.set(date, [slice]);
    } else {
      slices.push(slice);
    }
  }

  return days;
}

/** The parsed body, or the HTTP status when the call did not go through. */
async function fetchJson<T>(url: URL): Promise<T | number> {
  const response = await fetch(url, {
    method: "GET",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) return response.status;

  return (await response.json()) as T;
}

function buildUrl(
  endpoint: string,
  lat: number,
  lng: number,
  language: WeatherLanguage,
  apiKey: string,
): URL {
  const url = new URL(endpoint);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("units", "metric");
  url.searchParams.set("lang", language);
  url.searchParams.set("appid", apiKey);

  return url;
}

/**
 * Fetch the weather at a point: what it is doing right now, the three hour
 * slots left in the day, and the evening of each following day.
 *
 * The API key is read from the environment on the server and never reaches the
 * browser. Descriptions come back already translated in `language`.
 */
export async function getWeather(
  lat: number,
  lng: number,
  language: WeatherLanguage,
): Promise<WeatherResult> {
  const apiKey = process.env.OPEN_WEATHER_API_KEY;

  if (apiKey === undefined || apiKey === "") return { status: "unauthorized" };

  let current: CurrentResponse | number;
  let forecast: ForecastResponse | number;

  try {
    [current, forecast] = await Promise.all([
      fetchJson<CurrentResponse>(
        buildUrl(CURRENT_ENDPOINT, lat, lng, language, apiKey),
      ),
      fetchJson<ForecastResponse>(
        buildUrl(FORECAST_ENDPOINT, lat, lng, language, apiKey),
      ),
    ]);
  } catch {
    return { status: "unavailable" };
  }

  for (const answer of [current, forecast]) {
    if (typeof answer !== "number") continue;
    // 401 covers a key that is missing, mistyped, or still being activated.
    if (answer === 401 || answer === 403) return { status: "unauthorized" };
    return { status: "unavailable" };
  }

  const currentRaw = current as CurrentResponse;
  const forecastRaw = forecast as ForecastResponse;
  const entries = forecastRaw.list ?? [];

  if (currentRaw.main === undefined || entries.length === 0) {
    return { status: "unavailable" };
  }

  const offsetSec = currentRaw.timezone ?? forecastRaw.city?.timezone ?? 0;
  const today = localDate(Math.floor(Date.now() / 1000), offsetSec);
  const byDay = groupByDay(entries, offsetSec);
  const todaySlices = byDay.get(today) ?? [];
  const days: ForecastDay[] = [];

  for (const [date, slices] of byDay) {
    if (date <= today || days.length >= MAX_FORECAST_DAYS) continue;

    const evening = eveningSlice(slices);
    if (evening === null) continue;

    days.push({
      date,
      tempMin: Math.min(...slices.map((slice) => slice.temp)),
      tempMax: Math.max(...slices.map((slice) => slice.temp)),
      evening,
    });
  }

  return {
    status: "ok",
    report: {
      utcOffsetSec: offsetSec,
      placeName: currentRaw.name ?? forecastRaw.city?.name ?? "",
      current: toCurrent(currentRaw),
      todaySlices,
      todayMin:
        todaySlices.length === 0
          ? null
          : Math.min(...todaySlices.map((slice) => slice.temp)),
      todayMax:
        todaySlices.length === 0
          ? null
          : Math.max(...todaySlices.map((slice) => slice.temp)),
      days,
    },
  };
}
