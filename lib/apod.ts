/** NASA's Astronomy Picture of the Day (APOD), fetched from api.nasa.gov. */

export type ApodMediaType = "image" | "video" | "other";

export interface ApodPicture {
  /** Day the picture was published, as `YYYY-MM-DD` */
  date: string;
  title: string;
  explanation: string;
  /** Photographer or copyright holder, absent when the image is public domain */
  copyright: string | null;
  mediaType: ApodMediaType;
  /** Still to display: the picture itself, or the thumbnail of a video */
  imageUrl: string | null;
  /** Full resolution version, when NASA publishes one */
  hdImageUrl: string | null;
  /** What the picture links to: the image itself, or the video to watch */
  sourceUrl: string;
  /** The apod.nasa.gov page of that day, with its original caption */
  pageUrl: string;
}

/** Shape returned by the APOD endpoint; every field but `date` is optional. */
interface ApodResponse {
  date?: string;
  title?: string;
  explanation?: string;
  copyright?: string;
  media_type?: string;
  url?: string;
  hdurl?: string;
  thumbnail_url?: string;
}

const APOD_ENDPOINT = "https://api.nasa.gov/planetary/apod";

/**
 * How long a fetch is given before the tab falls back to its error state. The
 * NASA API is occasionally slow to answer a cold request, hence the margin.
 */
const TIMEOUT_MS = 15_000;

function toMediaType(value: string | undefined): ApodMediaType {
  if (value === "image") return "image";
  if (value === "video") return "video";
  return "other";
}

/**
 * The apod.nasa.gov permalink of a given day, whose file name is the date
 * written as `apYYMMDD.html`.
 */
export function buildApodPageUrl(date: string): string {
  const [year, month, day] = date.split("-");
  return `https://apod.nasa.gov/apod/ap${year.slice(2)}${month}${day}.html`;
}

function toPicture(payload: ApodResponse): ApodPicture {
  const mediaType = toMediaType(payload.media_type);
  const date = payload.date ?? new Date().toISOString().slice(0, 10);

  // Videos have no image of their own: `thumbs=true` asks NASA for a still.
  const imageUrl =
    mediaType === "image"
      ? (payload.url ?? payload.hdurl ?? null)
      : (payload.thumbnail_url ?? null);

  return {
    date,
    title: payload.title ?? "",
    explanation: payload.explanation ?? "",
    copyright: payload.copyright?.trim().replace(/\s+/g, " ") ?? null,
    mediaType,
    imageUrl,
    hdImageUrl: mediaType === "image" ? (payload.hdurl ?? null) : null,
    sourceUrl: payload.url ?? buildApodPageUrl(date),
    pageUrl: buildApodPageUrl(date),
  };
}

/**
 * Fetch the picture of the day. Without a `date` (`YYYY-MM-DD`), NASA returns
 * the latest published one.
 *
 * The API key is read from the environment on the server and never reaches the
 * browser.
 */
export async function getApod(date?: string): Promise<ApodPicture> {
  const apiKey = process.env.NASA_API_KEY;

  if (apiKey === undefined || apiKey === "") {
    throw new Error("NASA_API_KEY absente de l'environnement.");
  }

  const url = new URL(APOD_ENDPOINT);
  url.searchParams.set("api_key", apiKey);
  // Ask for a still for the days when the APOD is a video.
  url.searchParams.set("thumbs", "true");
  if (date !== undefined) url.searchParams.set("date", date);

  const response = await fetch(url, {
    method: "GET",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(
      `L'API APOD de la NASA a répondu ${response.status} ${response.statusText}.`,
    );
  }

  return toPicture((await response.json()) as ApodResponse);
}
