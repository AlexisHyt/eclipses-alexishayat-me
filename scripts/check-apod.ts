import { buildApodPageUrl, getApod } from "@/lib/apod";

/**
 * Days kept as fixtures: a plain image, an embedded video served with its
 * thumbnail, and a video published as an `.mp4` file, which comes with no
 * thumbnail at all and has to be played on the page.
 */
const FIXTURES = [
  { date: "2024-04-08", expectedMedia: "image", expectedVideoFile: false },
  { date: "2025-01-05", expectedMedia: "video", expectedVideoFile: false },
  { date: "2026-05-04", expectedMedia: "video", expectedVideoFile: true },
] as const;

async function main() {
  const today = await getApod();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(today.date)) {
    throw new Error(`Date inattendue: ${today.date}.`);
  }

  if (today.title === "") {
    throw new Error("Photo du jour sans titre.");
  }

  if (today.explanation.length < 40) {
    throw new Error("Explication du jour vide ou tronquée.");
  }

  // NASA publishes the day's picture around 05:00 UTC, so the API can still be
  // serving yesterday's: anything older than that would mean a stale feed.
  const ageDays =
    (Date.now() - new Date(`${today.date}T00:00:00Z`).getTime()) /
    (24 * 60 * 60 * 1000);

  if (ageDays < 0 || ageDays > 2) {
    throw new Error(`Photo du jour datée du ${today.date}, soit hors du jour.`);
  }

  if (today.pageUrl !== buildApodPageUrl(today.date)) {
    throw new Error("Lien apod.nasa.gov incohérent avec la date.");
  }

  console.log(
    `OK aujourd'hui: « ${today.title} » (${today.date}, ${today.mediaType}${today.copyright !== null ? `, © ${today.copyright}` : ", domaine public"}).`,
  );

  for (const fixture of FIXTURES) {
    const picture = await getApod(fixture.date);

    if (picture.date !== fixture.date) {
      throw new Error(
        `${fixture.date}: l'API a renvoyé ${picture.date} à la place.`,
      );
    }

    if (picture.mediaType !== fixture.expectedMedia) {
      throw new Error(
        `${fixture.date}: média ${picture.mediaType} au lieu de ${fixture.expectedMedia}.`,
      );
    }

    if (fixture.expectedVideoFile) {
      if (picture.videoUrl === null) {
        throw new Error(
          `${fixture.date}: fichier vidéo attendu, aucun repéré.`,
        );
      }

      if (!picture.videoUrl.endsWith(".mp4")) {
        throw new Error(
          `${fixture.date}: fichier vidéo inattendu (${picture.videoUrl}).`,
        );
      }
    } else if (picture.videoUrl !== null) {
      throw new Error(
        `${fixture.date}: pris pour un fichier vidéo (${picture.videoUrl}).`,
      );
    }

    // Images, vignettes et fichiers vidéo : il faut un média à afficher.
    const media = picture.videoUrl ?? picture.imageUrl;

    if (media === null) {
      throw new Error(`${fixture.date}: aucun média à afficher.`);
    }

    if (!media.startsWith("https://")) {
      throw new Error(`${fixture.date}: média servi hors HTTPS.`);
    }

    if (fixture.expectedMedia === "video" && picture.hdImageUrl !== null) {
      throw new Error(
        `${fixture.date}: une vidéo ne peut pas avoir de version haute résolution.`,
      );
    }

    console.log(
      `OK ${fixture.date}: « ${picture.title} » (${picture.mediaType}${picture.videoUrl !== null ? ", fichier" : ""}) → ${media}`,
    );
  }

  console.log("OK: photo du jour de la NASA accessible et complète.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
