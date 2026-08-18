import type { ApsisType } from "@/lib/apsides";
import type { EclipseType } from "@/lib/eclipses";
import type { MoonPhaseKey, MoonQuarterKey } from "@/lib/moon";
import type { SkyBodyId } from "@/lib/sky";
import type { TransitPlanet, TransitVisibility } from "@/lib/transits";

export const LOCALES = ["fr", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "fr";

/** Language names stay in their own language, as is customary in a switcher. */
export const LOCALE_NAMES: Record<Locale, string> = {
  fr: "Français",
  en: "English",
};

/** BCP 47 tags handed to `Intl`; `en-GB` keeps the 24 h clock used throughout. */
export const LOCALE_TAGS: Record<Locale, string> = {
  fr: "fr-FR",
  en: "en-GB",
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/**
 * French is the source dictionary: `Dictionary` is inferred from it, so every
 * other language is checked against it at compile time.
 */
const fr = {
  language: {
    label: "Langue",
  },

  header: {
    iconAlt: "Icône de Sky",
    subtitle: "Le ciel, depuis chez vous",
  },

  footer: {
    dataVia: "Données calculées via",
  },

  location: {
    title: "Votre emplacement",
    placeholder: "Rechercher une ville ou une adresse…",
    useMyPosition: "Utiliser ma position",
    myPosition: "Ma position",
  },

  tabs: {
    label: "Sections",
    apod: "Photo du jour",
    weather: "Météo",
    eclipses: "Éclipses",
    moon: "Phases de Lune",
    sun: "Soleil",
    apsides: "Apsides",
    night: "Ciel du soir",
    transits: "Transits",
  },

  apod: {
    error: "Impossible de récupérer la photo du jour de la NASA.",
    intro:
      "Chaque jour, la NASA publie une image de l'Univers accompagnée de son explication, écrite par un astronome.",
    videoBadge: "Vidéo du jour",
    watchVideo: "Regarder la vidéo",
    openSource: "Ouvrir le média d'origine",
    hdLink: "Voir en haute résolution",
    pageLink: "Page du jour sur apod.nasa.gov",
    publicDomain: "NASA · domaine public",
    byAuthor: (author: string) => `© ${author}`,
    imageAlt: (title: string) => `Photo du jour de la NASA : ${title}`,
    noMedia: "Le média du jour ne peut pas être affiché ici.",
    englishNote: "Explication reprise telle quelle de la NASA, en anglais.",
    credit: "Astronomy Picture of the Day · NASA / api.nasa.gov",
  },

  weather: {
    errorUnavailable:
      "Impossible de récupérer la météo pour cet emplacement. Veuillez réessayer.",
    errorUnauthorized:
      "Clé OpenWeatherMap refusée. Vérifiez OPEN_WEATHER_API_KEY dans le fichier .env ; une clé nouvellement créée peut mettre jusqu'à deux heures à être activée.",
    pickLocation:
      "Sélectionnez un emplacement pour voir la météo d'aujourd'hui et des prochains jours.",
    nowAt: (place: string) => `Maintenant à ${place}`,
    yourLocation: "votre emplacement",
    feelsLike: (temperature: string) => `Ressenti ${temperature}`,
    todayRange: (min: string, max: string) =>
      `${min} / ${max} d'ici la fin de la journée`,
    todayHours: "Aujourd'hui, par tranches de 3 heures",
    noSlices:
      "Plus aucune tranche pour aujourd'hui : la prévision reprend demain.",
    daysTitle: (count: number) => `Les ${count} prochains jours`,
    eveningNote:
      "Chaque jour est résumé par sa tranche du soir, la plus proche de 18 h locale ; les températures encadrant la barre sont le minimum et le maximum de la journée entière.",
    evening: "Soir",
    humidity: "Humidité",
    wind: "Vent",
    gust: "Rafales",
    pressure: "Pression",
    visibility: "Visibilité",
    clouds: "Nébulosité",
    dewPoint: "Point de rosée",
    pop: "Risque de précipitations",
    sunrise: "Lever du Soleil",
    sunset: "Coucher du Soleil",
    timeZoneNote: (offset: string) =>
      `Heures indiquées à l'heure locale de l'emplacement (${offset}), format 24 h.`,
    credit:
      "Observations et prévisions OpenWeatherMap · relevé actuel et prévision à 5 jours par tranches de 3 h · point de rosée déduit de la température et de l'humidité",
  },

  eclipses: {
    modeTitle: "Mode d'exploration",
    modeLocal: "Local",
    modeGlobal: "Monde · Totales",
    globalNoteBefore: "Affiche les prochaines éclipses solaires ",
    globalNoteStrong: "totales",
    globalNoteAfter:
      " partout dans le monde, sans tenir compte de l'emplacement choisi.",
    batchNote: (size: number) =>
      `Chargement progressif par lots de ${size} éclipses.`,
    errorLocal: "Erreur lors du calcul des éclipses. Veuillez réessayer.",
    errorGlobal: "Erreur lors du chargement des éclipses mondiales.",
    emptyLocal:
      "Aucune éclipse solaire visible depuis cet emplacement dans les années à venir.",
    emptyGlobal:
      "Aucune éclipse totale mondiale trouvée dans l'intervalle recherché.",
    countLocal: (count: number) =>
      `${count} prochaine${count > 1 ? "s" : ""} éclipse${count > 1 ? "s" : ""} visible${count > 1 ? "s" : ""}`,
    countGlobal: (count: number) =>
      `${count} éclipse${count > 1 ? "s" : ""} totale${count > 1 ? "s" : ""} chargée${count > 1 ? "s" : ""}`,
    loading: "Chargement…",
    loadMore: "Charger plus d'éclipses totales",
    accuracy:
      "Calculs basés sur les éphémérides VSOP87 via astronomy-engine · Précision ±1 minute",
    pickLocation:
      "Sélectionnez un emplacement pour voir les prochaines éclipses solaires.",
    pickGlobal:
      "Chargez la vue mondiale pour explorer les prochaines éclipses totales.",
  },

  eclipseCard: {
    types: {
      Total: "Totale",
      Annular: "Annulaire",
      Partial: "Partielle",
    } satisfies Record<EclipseType, string>,
    peak: "Pic",
    obscuration: "Obscuration",
    centralDuration: "Durée centrale",
    maximum: "Maximum",
    timeZoneNote: (timeZone: string) =>
      `Heures affichées selon votre fuseau navigateur (${timeZone}), format 24 h.`,
    partialBegin: "Début partiel",
    partialEnd: "Fin partiel",
    centralBegin: (type: EclipseType) =>
      `Début ${type === "Total" ? "total" : "annulaire"}`,
    centralEnd: (type: EclipseType) =>
      `Fin ${type === "Total" ? "total" : "annulaire"}`,
    nasaUnreachable: "Impossible de contacter les serveurs de la NASA",
    nasaPathMissing:
      "Trajectoire centrale NASA non disponible pour cette éclipse.",
    localTimes: "Heures locales",
    globalView: "Vue mondiale",
    nasaSource: "Trajectoire source NASA (quand disponible)",
    yourPosition: "Votre position",
  },

  moon: {
    error: "Erreur lors du calcul des phases de la Lune.",
    currentPhase: "Phase actuelle",
    illumination: "Illumination",
    age: "Âge",
    ageUnit: "j",
    distance: "Distance",
    rise: "Lever",
    set: "Coucher",
    week: "Les 7 prochains jours",
    today: "Aujourd'hui",
    riseSetNote: (place: string) =>
      `Sous chaque jour : heure de lever · heure de coucher de la Lune pour ${place}.`,
    yourLocation: "votre emplacement",
    pickLocation:
      "Sélectionnez un emplacement pour afficher les heures de lever et de coucher de la Lune.",
    quarters: "Phases principales de la semaine",
    credit: (timeZone: string) =>
      `Phases calculées avec astronomy-engine · heures dans votre fuseau (${timeZone})`,
    discLabel: (percent: number) => `Lune éclairée à ${percent} %`,
    phases: {
      new: "Nouvelle Lune",
      "waxing-crescent": "Premier croissant",
      "first-quarter": "Premier quartier",
      "waxing-gibbous": "Gibbeuse croissante",
      full: "Pleine Lune",
      "waning-gibbous": "Gibbeuse décroissante",
      "last-quarter": "Dernier quartier",
      "waning-crescent": "Dernier croissant",
    } satisfies Record<MoonPhaseKey, string>,
    quarterNames: {
      new: "Nouvelle Lune",
      "first-quarter": "Premier quartier",
      full: "Pleine Lune",
      "last-quarter": "Dernier quartier",
    } satisfies Record<MoonQuarterKey, string>,
  },

  sun: {
    error: "Erreur lors du calcul de la course du Soleil.",
    pickLocation:
      "Sélectionnez un emplacement pour voir le lever, la culmination et le coucher du Soleil.",
    todayAt: (place: string) => `Aujourd'hui à ${place}`,
    rise: "Lever",
    culmination: "Culmination",
    set: "Coucher",
    aboveHorizon: (altitude: string) => `${altitude}° au-dessus de l'horizon`,
    dayLength: "Durée du jour",
    sinceYesterday: (delta: string) => `(${delta} depuis hier)`,
    civilDawn: "Aube civile",
    civilDusk: "Crépuscule civil",
    currentAltitude: "Soleil actuellement à",
    week: "Les 7 prochains jours",
    today: "Aujourd'hui",
    columnDay: "Jour",
    columnDuration: "Durée",
    arcLabel: "Course du Soleil au-dessus de l'horizon",
    credit: (timeZone: string) =>
      `Altitudes corrigées de la réfraction atmosphérique · heures dans votre fuseau (${timeZone})`,
    regimes: {
      "polar-day": "Jour polaire",
      "polar-night": "Nuit polaire",
    } satisfies Record<"polar-day" | "polar-night", string>,
  },

  apsides: {
    error: "Erreur lors du calcul des apsides.",
    introBefore: "Une ",
    introStrong: "apside",
    introAfter:
      " est le point d'une orbite le plus proche ou le plus éloigné du corps autour duquel on tourne. Ces dates sont identiques partout sur Terre : elles ne dépendent pas de l'emplacement choisi.",
    moonSection: "Lune · périgée & apogée",
    sunSection: "Soleil · périhélie & aphélie",
    moonRange: (min: string, max: string) =>
      `Distance entre les centres de la Terre et de la Lune, qui varie d'environ ${min} à ${max}.`,
    sunNote:
      "Vue héliocentrique : le Soleil occupe le foyer de l'orbite, la Terre est placée à sa position réelle, et le segment entre les deux donne donc la direction réelle du Soleil. L'écart entre périhélie et aphélie représente environ 3 % de la distance moyenne.",
    credit: (timeZone: string) =>
      `Calculs basés sur les éphémérides VSOP87 / ELP2000 via astronomy-engine · heures dans votre fuseau (${timeZone})`,
    captionPosition: (body: string) => `Position réelle de ${body} le`,
    captionAt: "à",
    captionScale:
      "· distances à l'échelle, tailles des corps volontairement exagérées · le cercle en pointillé est l'orbite circulaire de même demi-grand axe · excentricité",
    captionDrag: "· faites glisser pour tourner autour de la scène.",
    webglUnavailable:
      "Votre navigateur ne permet pas d'afficher l'orbite en 3D (WebGL indisponible).",
    types: {
      perigee: "Périgée",
      apogee: "Apogée",
      perihelion: "Périhélie",
      aphelion: "Aphélie",
    } satisfies Record<ApsisType, string>,
    hints: {
      perigee: "au plus près de la Terre",
      apogee: "au plus loin de la Terre",
      perihelion: "Terre au plus près du Soleil",
      aphelion: "Terre au plus loin du Soleil",
    } satisfies Record<ApsisType, string>,
    /** Bare names, used as 3D labels in the orbit scenes. */
    bodies: {
      earth: "Terre",
      moon: "Lune",
      sun: "Soleil",
    },
    /** The same bodies inside a sentence, where French wants its article. */
    bodiesInSentence: {
      earth: "la Terre",
      moon: "la Lune",
    },
  },

  night: {
    error: "Erreur lors du calcul du ciel de la nuit.",
    pickLocation:
      "Sélectionnez un emplacement pour voir le ciel de la nuit prochaine.",
    skyOf: (place: string) => `Ciel de ${place}`,
    sliderLabel: "Avancer ou reculer dans la nuit",
    windowStart: "Début",
    windowEnd: "Fin",
    sunset: "Coucher du Soleil",
    sunrise: "Lever du Soleil",
    nightLength: (duration: string) => `${duration} de nuit`,
    backToNow: "Revenir à maintenant",
    constellations: "Constellations",
    fallbackWindow:
      "À cette latitude le Soleil ne se lève ou ne se couche pas en ce moment : la plage affichée couvre simplement 18 h à 6 h.",
    help: "Faites glisser pour regarder autour de vous, la molette pour zoomer. Les étoiles sont dessinées jusqu'à la magnitude 6,5, leur taille suit leur éclat et leur couleur leur indice B−V. Le curseur fait tourner la sphère céleste au rythme sidéral ; la Lune et les planètes, qui se déplacent par rapport aux étoiles, suivent leur propre trajectoire.",
    creditStarsFrom: "Étoiles du",
    creditCatalogue: "catalogue HYG",
    creditConstellationsFrom: "(CC BY-SA 4.0), constellations de",
    creditCredits: (timeZone: string) =>
      `(BSD 3-Clause), positions des planètes et heures calculées via astronomy-engine · fuseau ${timeZone}`,
    sphereError: "Impossible de charger les données du ciel.",
    cardinals: {
      north: "N",
      east: "E",
      south: "S",
      west: "O",
    },
    bodies: {
      moon: "Lune",
      mercury: "Mercure",
      venus: "Vénus",
      mars: "Mars",
      jupiter: "Jupiter",
      saturn: "Saturne",
      uranus: "Uranus",
    } satisfies Record<SkyBodyId, string>,
  },

  transits: {
    error: "Erreur lors du calcul des transits.",
    pickLocation:
      "Sélectionnez un emplacement pour voir les prochains transits visibles.",
    introBefore: "Un ",
    introStrong: "transit",
    introAfter:
      " se produit quand Mercure ou Vénus passe entre la Terre et le Soleil : la planète se détache alors en silhouette noire sur le disque solaire, pendant quelques heures.",
    rarity:
      "Mercure transite une douzaine de fois par siècle, Vénus deux fois tous les cent vingt ans environ : la liste couvre donc plusieurs siècles.",
    count: (count: number) =>
      `${count} prochain${count > 1 ? "s" : ""} transit${count > 1 ? "s" : ""} visible${count > 1 ? "s" : ""} d'ici`,
    empty: "Aucun transit visible depuis cet emplacement.",
    contactStart: "Premier contact",
    contactPeak: "Maximum",
    contactFinish: "Dernier contact",
    duration: "Durée totale",
    visibleWindow: "Visible d'ici",
    visibleFor: (duration: string) => `${duration} au-dessus de l'horizon`,
    sunAt: (altitude: string, compass: string) =>
      `Soleil à ${altitude}° · ${compass}`,
    sunBelow: "Soleil sous l'horizon",
    separation: "Séparation minimale",
    silhouette: "Silhouette",
    silhouetteRatio: (ratio: number) => `1/${ratio} du diamètre solaire`,
    sunDiameter: "Diamètre du Soleil",
    discLabel: (planet: string) =>
      `Trajet de ${planet} sur le disque solaire, vu depuis la Terre`,
    discCaption:
      "Schéma : la corde est placée à sa distance réelle du centre du disque et la silhouette est à l'échelle, mais l'inclinaison du trajet n'est pas représentée.",
    timeZoneNote: (timeZone: string) =>
      `Heures affichées selon votre fuseau navigateur (${timeZone}), format 24 h.`,
    credit: (timeZone: string) =>
      `Contacts géocentriques via astronomy-engine, hauteurs du Soleil corrigées de la réfraction · fuseau ${timeZone}`,
    planets: {
      mercury: "Mercure",
      venus: "Vénus",
    } satisfies Record<TransitPlanet, string>,
    visibility: {
      full: "Entièrement visible",
      partial: "Partiellement visible",
    } satisfies Record<TransitVisibility, string>,
  },
};

export type Dictionary = typeof fr;

const en: Dictionary = {
  language: {
    label: "Language",
  },

  header: {
    iconAlt: "Sky icon",
    subtitle: "The sky, from where you are",
  },

  footer: {
    dataVia: "Data computed with",
  },

  location: {
    title: "Your location",
    placeholder: "Search for a city or an address…",
    useMyPosition: "Use my position",
    myPosition: "My position",
  },

  tabs: {
    label: "Sections",
    apod: "Picture of the day",
    weather: "Weather",
    eclipses: "Eclipses",
    moon: "Moon phases",
    sun: "Sun",
    apsides: "Apsides",
    night: "Night sky",
    transits: "Transits",
  },

  apod: {
    error: "Could not fetch NASA's picture of the day.",
    intro:
      "Every day, NASA publishes an image of our universe along with its explanation, written by an astronomer.",
    videoBadge: "Video of the day",
    watchVideo: "Watch the video",
    openSource: "Open the original media",
    hdLink: "View in high resolution",
    pageLink: "See the day's page on apod.nasa.gov",
    publicDomain: "NASA · public domain",
    byAuthor: (author: string) => `© ${author}`,
    imageAlt: (title: string) => `NASA's picture of the day: ${title}`,
    noMedia: "The media of the day cannot be displayed here.",
    englishNote: "Explanation reproduced as published by NASA.",
    credit: "Astronomy Picture of the Day · NASA / api.nasa.gov",
  },

  weather: {
    errorUnavailable:
      "Could not fetch the weather for this location. Please try again.",
    errorUnauthorized:
      "OpenWeatherMap rejected the API key. Check OPEN_WEATHER_API_KEY in the .env file; a freshly created key can take up to two hours to become active.",
    pickLocation: "Pick a location to see today's weather and the days ahead.",
    nowAt: (place: string) => `Right now in ${place}`,
    yourLocation: "your location",
    feelsLike: (temperature: string) => `Feels like ${temperature}`,
    todayRange: (min: string, max: string) =>
      `${min} / ${max} for the rest of the day`,
    todayHours: "Today, in 3-hour slots",
    noSlices: "No slot left for today: the forecast resumes tomorrow.",
    daysTitle: (count: number) => `The next ${count} days`,
    eveningNote:
      "Each day is summed up by its evening slot, the one closest to 18:00 local time; the temperatures around the bar are the minimum and maximum of the whole day.",
    evening: "Evening",
    humidity: "Humidity",
    wind: "Wind",
    gust: "Gusts",
    pressure: "Pressure",
    visibility: "Visibility",
    clouds: "Cloud cover",
    dewPoint: "Dew point",
    pop: "Chance of precipitation",
    sunrise: "Sunrise",
    sunset: "Sunset",
    timeZoneNote: (offset: string) =>
      `Times shown in the location's local time (${offset}), 24 h format.`,
    credit:
      "Observations and forecast from OpenWeatherMap · current reading and 5-day forecast in 3-hour slots · dew point derived from temperature and humidity",
  },

  eclipses: {
    modeTitle: "Browsing mode",
    modeLocal: "Local",
    modeGlobal: "World · Total",
    globalNoteBefore: "Shows the next ",
    globalNoteStrong: "total",
    globalNoteAfter:
      " solar eclipses anywhere in the world, regardless of the location you picked.",
    batchNote: (size: number) =>
      `Loaded progressively, ${size} eclipses at a time.`,
    errorLocal: "Could not compute the eclipses. Please try again.",
    errorGlobal: "Could not load the worldwide eclipses.",
    emptyLocal:
      "No solar eclipse visible from this location in the coming years.",
    emptyGlobal: "No worldwide total eclipse found in the searched interval.",
    countLocal: (count: number) =>
      `${count} upcoming visible eclipse${count > 1 ? "s" : ""}`,
    countGlobal: (count: number) =>
      `${count} total eclipse${count > 1 ? "s" : ""} loaded`,
    loading: "Loading…",
    loadMore: "Load more total eclipses",
    accuracy:
      "Computed from the VSOP87 ephemerides via astronomy-engine · Accuracy ±1 minute",
    pickLocation: "Pick a location to see the next solar eclipses.",
    pickGlobal: "Load the world view to explore the next total eclipses.",
  },

  eclipseCard: {
    types: {
      Total: "Total",
      Annular: "Annular",
      Partial: "Partial",
    },
    peak: "Peak",
    obscuration: "Obscuration",
    centralDuration: "Central duration",
    maximum: "Maximum",
    timeZoneNote: (timeZone: string) =>
      `Times shown in your browser time zone (${timeZone}), 24 h format.`,
    partialBegin: "Partial begins",
    partialEnd: "Partial ends",
    centralBegin: (type: EclipseType) =>
      `${type === "Total" ? "Totality" : "Annularity"} begins`,
    centralEnd: (type: EclipseType) =>
      `${type === "Total" ? "Totality" : "Annularity"} ends`,
    nasaUnreachable: "Could not reach the NASA servers",
    nasaPathMissing: "NASA central path unavailable for this eclipse.",
    localTimes: "Local times",
    globalView: "World view",
    nasaSource: "Path sourced from NASA (when available)",
    yourPosition: "Your position",
  },

  moon: {
    error: "Could not compute the Moon phases.",
    currentPhase: "Current phase",
    illumination: "Illumination",
    age: "Age",
    ageUnit: "d",
    distance: "Distance",
    rise: "Rise",
    set: "Set",
    week: "The next 7 days",
    today: "Today",
    riseSetNote: (place: string) =>
      `Under each day: moonrise · moonset for ${place}.`,
    yourLocation: "your location",
    pickLocation: "Pick a location to show moonrise and moonset times.",
    quarters: "Main phases this week",
    credit: (timeZone: string) =>
      `Phases computed with astronomy-engine · times in your time zone (${timeZone})`,
    discLabel: (percent: number) => `Moon ${percent} % illuminated`,
    phases: {
      new: "New Moon",
      "waxing-crescent": "Waxing crescent",
      "first-quarter": "First quarter",
      "waxing-gibbous": "Waxing gibbous",
      full: "Full Moon",
      "waning-gibbous": "Waning gibbous",
      "last-quarter": "Last quarter",
      "waning-crescent": "Waning crescent",
    },
    quarterNames: {
      new: "New Moon",
      "first-quarter": "First quarter",
      full: "Full Moon",
      "last-quarter": "Last quarter",
    },
  },

  sun: {
    error: "Could not compute the Sun's course.",
    pickLocation: "Pick a location to see sunrise, culmination and sunset.",
    todayAt: (place: string) => `Today in ${place}`,
    rise: "Rise",
    culmination: "Culmination",
    set: "Set",
    aboveHorizon: (altitude: string) => `${altitude}° above the horizon`,
    dayLength: "Day length",
    sinceYesterday: (delta: string) => `(${delta} since yesterday)`,
    civilDawn: "Civil dawn",
    civilDusk: "Civil dusk",
    currentAltitude: "Sun currently at",
    week: "The next 7 days",
    today: "Today",
    columnDay: "Day",
    columnDuration: "Length",
    arcLabel: "The Sun's course above the horizon",
    credit: (timeZone: string) =>
      `Altitudes corrected for atmospheric refraction · times in your time zone (${timeZone})`,
    regimes: {
      "polar-day": "Polar day",
      "polar-night": "Polar night",
    },
  },

  apsides: {
    error: "Could not compute the apsides.",
    introBefore: "An ",
    introStrong: "apsis",
    introAfter:
      " is the point of an orbit closest to, or furthest from, the body being orbited. These dates are the same everywhere on Earth: they do not depend on the location you picked.",
    moonSection: "Moon · perigee & apogee",
    sunSection: "Sun · perihelion & aphelion",
    moonRange: (min: string, max: string) =>
      `Distance between the centres of the Earth and the Moon, which varies from about ${min} to ${max}.`,
    sunNote:
      "Heliocentric view: the Sun sits at the focus of the orbit, the Earth is placed at its real position, and the segment between the two therefore gives the real direction of the Sun. The gap between perihelion and aphelion is about 3 % of the mean distance.",
    credit: (timeZone: string) =>
      `Computed from the VSOP87 / ELP2000 ephemerides via astronomy-engine · times in your time zone (${timeZone})`,
    captionPosition: (body: string) => `Real position of ${body} on`,
    captionAt: "at",
    captionScale:
      "· distances to scale, body sizes deliberately exaggerated · the dotted circle is the circular orbit of the same semi-major axis · eccentricity",
    captionDrag: "· drag to rotate around the scene.",
    webglUnavailable:
      "Your browser cannot display the orbit in 3D (WebGL unavailable).",
    types: {
      perigee: "Perigee",
      apogee: "Apogee",
      perihelion: "Perihelion",
      aphelion: "Aphelion",
    },
    hints: {
      perigee: "closest to the Earth",
      apogee: "furthest from the Earth",
      perihelion: "Earth closest to the Sun",
      aphelion: "Earth furthest from the Sun",
    },
    bodies: {
      earth: "Earth",
      moon: "Moon",
      sun: "Sun",
    },
    bodiesInSentence: {
      earth: "the Earth",
      moon: "the Moon",
    },
  },

  night: {
    error: "Could not compute tonight's sky.",
    pickLocation: "Pick a location to see the sky of the coming night.",
    skyOf: (place: string) => `Sky over ${place}`,
    sliderLabel: "Move forward or back through the night",
    windowStart: "Start",
    windowEnd: "End",
    sunset: "Sunset",
    sunrise: "Sunrise",
    nightLength: (duration: string) => `${duration} of night`,
    backToNow: "Back to now",
    constellations: "Constellations",
    fallbackWindow:
      "At this latitude the Sun does not currently rise or set: the window shown simply spans 18:00 to 06:00.",
    help: "Drag to look around, scroll to zoom. Stars are drawn down to magnitude 6.5, their size follows their brightness and their colour their B−V index. The slider spins the celestial sphere at the sidereal rate; the Moon and the planets, which drift against the stars, follow their own path.",
    creditStarsFrom: "Stars from the",
    creditCatalogue: "HYG catalogue",
    creditConstellationsFrom: "(CC BY-SA 4.0), constellations from",
    creditCredits: (timeZone: string) =>
      `(BSD 3-Clause), planet positions and times computed with astronomy-engine · time zone ${timeZone}`,
    sphereError: "Could not load the sky data.",
    cardinals: {
      north: "N",
      east: "E",
      south: "S",
      west: "W",
    },
    bodies: {
      moon: "Moon",
      mercury: "Mercury",
      venus: "Venus",
      mars: "Mars",
      jupiter: "Jupiter",
      saturn: "Saturn",
      uranus: "Uranus",
    },
  },

  transits: {
    error: "Could not compute the transits.",
    pickLocation: "Pick a location to see the next visible transits.",
    introBefore: "A ",
    introStrong: "transit",
    introAfter:
      " happens when Mercury or Venus passes between the Earth and the Sun: for a few hours, the planet stands out as a black silhouette against the solar disc.",
    rarity:
      "Mercury transits about a dozen times per century, Venus twice every hundred and twenty years or so: the list therefore spans several centuries.",
    count: (count: number) =>
      `${count} upcoming transit${count > 1 ? "s" : ""} visible from here`,
    empty: "No transit visible from this location.",
    contactStart: "First contact",
    contactPeak: "Greatest transit",
    contactFinish: "Last contact",
    duration: "Total duration",
    visibleWindow: "Visible from here",
    visibleFor: (duration: string) => `${duration} above the horizon`,
    sunAt: (altitude: string, compass: string) =>
      `Sun at ${altitude}° · ${compass}`,
    sunBelow: "Sun below the horizon",
    separation: "Minimum separation",
    silhouette: "Silhouette",
    silhouetteRatio: (ratio: number) => `1/${ratio} of the Sun's diameter`,
    sunDiameter: "Sun's diameter",
    discLabel: (planet: string) =>
      `Path of ${planet} across the solar disc, seen from the Earth`,
    discCaption:
      "Schematic: the chord sits at its real distance from the centre of the disc and the silhouette is to scale, but the tilt of the path is not shown.",
    timeZoneNote: (timeZone: string) =>
      `Times shown in your browser time zone (${timeZone}), 24 h format.`,
    credit: (timeZone: string) =>
      `Geocentric contacts via astronomy-engine, Sun altitudes corrected for refraction · time zone ${timeZone}`,
    planets: {
      mercury: "Mercury",
      venus: "Venus",
    },
    visibility: {
      full: "Fully visible",
      partial: "Partly visible",
    },
  },
};

export const DICTIONARIES: Record<Locale, Dictionary> = { fr, en };
