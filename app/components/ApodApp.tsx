"use client";

import { useEffect, useState, useTransition } from "react";
import { fetchApod } from "@/app/actions/apod";
import { useFormatters, useI18n } from "@/app/i18n/context";
import type { ApodPicture } from "@/lib/apod";

/** Link styled as the discreet, underlined links used across the site. */
function SourceLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/10"
    >
      {children}
      <svg
        aria-hidden="true"
        className="h-3.5 w-3.5 text-white/40"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13.5 6H18v4.5M17.5 6.5 10 14M15 14.5V18H6V9h3.5"
        />
      </svg>
    </a>
  );
}

export default function ApodApp() {
  const { t } = useI18n();
  const fmt = useFormatters();
  const [picture, setPicture] = useState<ApodPicture | null>(null);
  const [failed, setFailed] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setFailed(false);
    startTransition(async () => {
      try {
        setPicture(await fetchApod());
      } catch (e) {
        setFailed(true);
        console.error(e);
      }
    });
  }, []);

  if (isPending && picture === null) {
    return (
      <div className="flex flex-col gap-4">
        <div className="aspect-[3/2] w-full animate-pulse rounded-2xl bg-white/4" />
        <div className="h-6 w-2/3 animate-pulse rounded-lg bg-white/4" />
        <div className="h-24 w-full animate-pulse rounded-lg bg-white/4" />
      </div>
    );
  }

  if (failed) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-400">
        {t.apod.error}
      </div>
    );
  }

  if (picture === null) return null;

  const isVideo = picture.mediaType === "video";
  // The date carries no time: noon keeps it on the right day in every zone.
  const dateISO = `${picture.date}T12:00:00Z`;

  return (
    <div
      className={`flex flex-col gap-6 transition-opacity ${isPending ? "opacity-50" : ""}`}
    >
      <section className="rounded-2xl border border-white/8 bg-white/3 px-5 py-4 text-sm text-white/55">
        {t.apod.intro}
      </section>

      <figure className="flex flex-col gap-4">
        {picture.imageUrl !== null ? (
          <a
            href={picture.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative overflow-hidden rounded-2xl border border-white/8 bg-white/3"
          >
            {/** biome-ignore lint/performance/noImgElement: the picture is a
             * remote NASA URL of unknown size, served straight from apod.nasa.gov. */}
            <img
              src={picture.imageUrl}
              alt={t.apod.imageAlt(picture.title)}
              className="w-full transition duration-500 group-hover:scale-[1.01]"
            />
            {isVideo && (
              <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur-sm">
                ▶ {t.apod.videoBadge}
              </span>
            )}
          </a>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 px-5 py-10 text-center text-sm text-white/30">
            {t.apod.noMedia}
          </div>
        )}

        <figcaption className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-xl font-semibold tracking-tight text-white">
              {picture.title}
            </h2>
            <span className="text-sm capitalize text-white/45">
              {fmt.fullDate(dateISO)}
            </span>
          </div>

          <p className="text-xs text-white/35">
            {picture.copyright !== null
              ? t.apod.byAuthor(picture.copyright)
              : t.apod.publicDomain}
          </p>

          <p className="text-sm leading-relaxed text-white/65">
            {picture.explanation}
          </p>
          <p className="text-xs text-white/25">{t.apod.englishNote}</p>
        </figcaption>
      </figure>

      <div className="flex flex-wrap gap-2">
        {isVideo && (
          <SourceLink href={picture.sourceUrl}>{t.apod.watchVideo}</SourceLink>
        )}
        {picture.hdImageUrl !== null && (
          <SourceLink href={picture.hdImageUrl}>{t.apod.hdLink}</SourceLink>
        )}
        {!isVideo &&
          picture.hdImageUrl === null &&
          picture.imageUrl === null && (
            <SourceLink href={picture.sourceUrl}>
              {t.apod.openSource}
            </SourceLink>
          )}
        <SourceLink href={picture.pageUrl}>{t.apod.pageLink}</SourceLink>
      </div>

      <p className="pt-1 text-center text-xs text-white/25">{t.apod.credit}</p>
    </div>
  );
}
