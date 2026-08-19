# Sky

Application Next.js 16 qui rassemble plusieurs outils d'observation du ciel, organisés en onglets autour d'un **emplacement commun à toute la page**.

## Onglets

### Photo du jour

- **Astronomy Picture of the Day** de la NASA, récupérée via `api.nasa.gov`
- image cliquable vers sa version d'origine, lien vers la **haute résolution** quand la NASA en publie une
- titre, date, auteur ou mention de domaine public, et explication intégrale
- prise en charge des jours où l'APOD est une **vidéo** : les fichiers `.mp4` publiés par la NASA sont lus directement dans la page, les vidéos hébergées ailleurs (YouTube, Vimeo) sont représentées par leur vignette, un badge et un lien de lecture
- onglet d'accueil, indépendant de l'emplacement
- clé d'API lue côté serveur, jamais exposée au navigateur

### Météo

- **conditions actuelles** à l'emplacement choisi : température, ressenti, vent et sa direction, humidité, pression, point de rosée, nébulosité, visibilité et rafales
- lever et coucher du Soleil, minimum et maximum attendus d'ici la fin de la journée
- **aujourd'hui par tranches de 3 heures** : bandeau défilant avec l'heure, le temps, la température, le risque de précipitations et le vent de chaque tranche
- **jours suivants** (jusqu'à 5) résumés par leur **tranche du soir**, la plus proche de 18 h locale
- barre de température situant chaque journée dans l'amplitude de la période affichée
- **icônes météo dessinées en SVG**, en version jour et nuit, pour les neuf familles de codes d'OpenWeatherMap
- heures affichées à l'heure locale de l'emplacement, et non dans le fuseau du navigateur
- descriptions traduites par l'API, dans la langue choisie sur le site
- API gratuite : relevé courant (`/data/2.5/weather`) et prévision à 5 jours (`/data/2.5/forecast`)
- clé d'API lue côté serveur, jamais exposée au navigateur

### Éclipses

- liste les prochaines éclipses solaires **visibles depuis l'emplacement choisi**
- mode mondial pour parcourir uniquement les prochaines éclipses **totales**
- prise en charge des éclipses **partielles**, **annulaires** et **totales**
- pagination progressive de la liste mondiale via **Charger plus**
- carte **Leaflet** inline dans chaque carte d'éclipse
- filtrage des éclipses réellement visibles localement (soleil au-dessus de l'horizon pendant au moins une phase)

### Phases de Lune

- phase actuelle avec disque lunaire dessiné en SVG (terminateur exact)
- illumination, âge lunaire et distance Terre–Lune
- phase pour chacun des **7 prochains jours**, alignés sur le calendrier local du visiteur
- heures de **lever et de coucher de la Lune** pour l'emplacement choisi
- phases principales (nouvelle lune, quartiers, pleine lune) tombant dans la semaine

### Soleil

- course du Soleil du jour dessinée en SVG, avec sa position actuelle sur l'arc
- **lever**, **culmination** et **coucher** pour l'emplacement choisi
- azimut au lever et au coucher (point cardinal + degrés), altitude à la culmination
- durée du jour et écart avec la veille
- aube et crépuscule civils (Soleil à 6° sous l'horizon)
- tableau des **7 prochains jours**, avec prise en charge du jour et de la nuit polaires

### Apsides

- **orbites en 3D** rendues avec Three.js, distances radiales à l'échelle
- corps volontairement hors échelle, sinon invisibles à ces distances
- la Lune et la Terre sont placées à leur **position réelle** à l'instant du chargement, avec leur distance mesurée
- cercle en pointillé de même demi-grand axe, pour rendre l'excentricité perceptible
- prochains **périgées et apogées** de la Lune, avec la distance Terre–Lune
- prochaines **périhélies et aphélies** du Soleil, en kilomètres et en unités astronomiques
- jauge situant chaque distance dans l'amplitude de l'orbite
- onglet indépendant de l'emplacement : ces dates sont les mêmes partout sur Terre

### Ciel du soir

- **sphère céleste en 3D** rendue avec Three.js, vue depuis le sol
- **8 920 étoiles** jusqu'à la magnitude 6,5, taille selon l'éclat et couleur selon l'indice B−V
- **figures des 88 constellations** (743 segments), avec leurs noms français, activables d'un bouton
- **Lune et planètes** (Mercure à Uranus) placées à leur position réelle et nommées
- extinction atmosphérique près de l'horizon, sol et ligne d'horizon, points cardinaux
- noms des étoiles les plus brillantes, masqués quand elles passent sous l'horizon
- **curseur** pour avancer ou reculer entre le coucher et le lever du Soleil, qui fait simplement tourner la sphère au rythme sidéral
- glisser pour regarder autour de soi, molette pour zoomer

### Transits

- les **20 prochains transits** de Mercure et de Vénus devant le Soleil, fusionnés par ordre chronologique
- ne sont retenus que ceux dont une partie se déroule **Soleil levé à l'emplacement choisi**
- premier, dernier contact et maximum, avec la **hauteur et l'azimut du Soleil** à chacun
- fenêtre réellement observable sur place, bornée au lever ou au coucher du Soleil à la seconde près
- distinction entre transit **entièrement** et **partiellement** visible
- schéma SVG du **trajet sur le disque solaire** : corde à sa distance réelle du centre, silhouette à l'échelle
- séparation minimale entre les centres, diamètre du Soleil et taille de la silhouette en secondes d'arc

## Emplacement

- recherche d'emplacement via **Nominatim / OpenStreetMap**
- bouton **Ma position** via la Geolocation API
- l'emplacement est partagé par tous les onglets

## Stack

- `next@16`
- `react@19`
- `astronomy-engine`
- `three`
- `leaflet`
- `tailwindcss@4`
- `bun`

## Lancer en local

```powershell
cd E:\___SITES___\sky.alexishayat.me
bun install
bun run dev
```

Ouvrir ensuite `http://localhost:3000`.

## Variables d'environnement

Un fichier `.env` à la racine, non commité, fournit les deux clés nécessaires :

```
NASA_API_KEY=votre_clé
OPEN_WEATHER_API_KEY=votre_clé
```

- `NASA_API_KEY` sert à l'onglet **Photo du jour** et s'obtient gratuitement sur
  [api.nasa.gov](https://api.nasa.gov). Elle est lue dans `lib/apod.ts`.
- `OPEN_WEATHER_API_KEY` sert à l'onglet **Météo** et est lue dans
  `lib/weather.ts`. Une clé du plan gratuit d'[OpenWeatherMap](https://openweathermap.org/api)
  suffit : l'onglet n'utilise que [`/data/2.5/weather`](https://openweathermap.org/current)
  et [`/data/2.5/forecast`](https://openweathermap.org/forecast5), sans
  souscription supplémentaire. Une clé neuve met en revanche jusqu'à deux
  heures à être activée ; tant qu'OpenWeatherMap la refuse, l'onglet le dit
  explicitement plutôt que d'afficher une erreur générique.

Les deux clés ne sont lues que côté serveur. Sans elles, seuls les onglets
concernés affichent un message ; le reste du site fonctionne normalement.

## Vérifier les calculs

Le projet contient de petits scripts qui valident les calculs astronomiques.

```powershell
cd E:\___SITES___\sky.alexishayat.me
bun run check:eclipses
bun run check:eclipses:global
bun run check:nasa
bun run check:moon
bun run check:sun
bun run check:apsides
bun run check:sky
bun run check:transits
bun run check:apod
bun run check:weather
```

`check:apod` et `check:weather` interrogent des API tierces : ils échouent en
l'absence de réseau ou de clé valide, et le disent.

## Régénérer les données du ciel

`public/stars.json` et `public/constellations.json` sont générés une fois puis
commités, pour que le site ne dépende d'aucun serveur tiers à l'exécution.

```powershell
cd E:\___SITES___\sky.alexishayat.me
bun run build:stars
bun run build:constellations
```

## Build de production

```powershell
cd E:\___SITES___\sky.alexishayat.me
bun run build
```

## Notes techniques

- Chaque domaine a sa bibliothèque de calcul : `lib/eclipses.ts`, `lib/moon.ts`, `lib/sun.ts`, `lib/apsides.ts`, `lib/transits.ts` et `lib/weather.ts`.
- La photo du jour est récupérée par une Server Action, mise en cache une heure : la clé NASA reste sur le serveur et une poignée d'appels suffit pour tous les visiteurs.
- Les jours où l'APOD est une vidéo, elle prend l'une de deux formes. Hébergée ailleurs, c'est une URL de lecteur intégré (YouTube, Vimeo) : le paramètre `thumbs=true` en fournit alors une vignette, affichée à la place de l'image avec un lien vers la vidéo. Publiée par la NASA, c'est un simple fichier `.mp4` servi par `apod.nasa.gov` : `lib/apod.ts` le reconnaît à son extension et l'onglet le lit sur place dans un lecteur `<video>`.
- Ces fichiers n'ont pas de vignette : l'API renvoie `thumbnail_url` vide plutôt qu'absent. `lib/apod.ts` ramène donc toute chaîne vide à `null`, sans quoi l'onglet afficherait une image cassée. La première image de la vidéo tient lieu d'aperçu.
- La météo tient en deux appels au plan gratuit d'OpenWeatherMap, lancés en parallèle : `/data/2.5/weather` pour le relevé courant et `/data/2.5/forecast` pour la prévision à 5 jours, livrée en tranches de 3 heures.
- Ces tranches sont regroupées par jour local, puis chaque jour suivant est représenté par sa **tranche du soir**, celle qui tombe entre 15 h et 23 h locales et le plus près de 18 h. Le dernier jour de la fenêtre s'arrête souvent avant la soirée : il est alors écarté plutôt que résumé par une tranche du matin, d'où une liste de 4 ou 5 jours selon l'heure de consultation.
- La météo passe par un profil de cache maison, `weather`, déclaré dans `next.config.ts` : OpenWeatherMap ne rafraîchit ses données que toutes les dix minutes et l'offre gratuite est comptée à l'appel, donc revalider plus vite ne ferait que consommer le quota — deux fois plus vite encore, l'onglet appelant deux points d'entrée.
- `lib/weather.ts` distingue trois issues — données, clé refusée, service injoignable — parce que Next.js masque le message des exceptions levées dans une Server Action : sans ce retour typé, l'onglet ne pourrait pas expliquer que c'est la clé qui est en cause.
- Les endpoints 2.5 donnent le fuseau de l'emplacement sous forme de décalage en secondes, pas de nom IANA : les instants sont donc décalés de ce montant puis lus en UTC, et le décalage est affiché tel quel (`UTC+2`).
- Chaque tranche est datée dans le fuseau de l'emplacement, sinon un visiteur éloigné verrait ses journées coupées à la mauvaise heure. Les heures de cet onglet suivent d'ailleurs l'emplacement et non le navigateur, contrairement au reste du site : un lever de Soleil à Sydney n'a de sens qu'à l'heure de Sydney.
- Le point de rosée n'est pas fourni par ces endpoints : il est calculé depuis la température et l'humidité par la formule de Magnus, à quelques dixièmes de degré près. `check:weather` compare la formule à deux cas connus avant de s'y fier.
- Les icônes météo sont dessinées dans `app/components/WeatherIcon.tsx` à partir de disques et de segments ; le croissant de Lune est découpé au masque SVG, ce qui le rend indépendant du fond.
- Les transits de Mercure et de Vénus sont deux séries indépendantes : `lib/transits.ts` les fusionne en avançant à chaque fois la planète dont le transit suivant est le plus proche.
- Les contacts renvoyés par astronomy-engine sont géocentriques ; la parallaxe de l'observateur les décale de quelques minutes au plus, à comparer aux heures que dure un transit.
- La fenêtre observable est l'intersection du transit avec le jour : la hauteur du Soleil est balayée toutes les 5 min, puis chaque passage de l'horizon est affiné par dichotomie à la seconde. Aux hautes latitudes la fenêtre peut contenir un coucher *et* un lever, d'où une liste d'intervalles.
- Les 20 transits retenus couvrent près de trois siècles : Mercure transite une douzaine de fois par siècle et la moitié environ des transits tombe de nuit sur un lieu donné.
- Les diamètres apparents sont calculés à partir des rayons IAU et de la distance géocentrique : la silhouette de Mercure fait de 1/195 à 1/160 du diamètre solaire selon le transit, celle de Vénus environ 1/31.
- La pagination mondiale des éclipses totales est calculée côté serveur depuis `SearchGlobalSolarEclipse` / `NextGlobalSolarEclipse`.
- Les trajectoires sont extraites des tables NASA GSFC `SEpath` (lignes centrales à intervalles de 120 s) via `lib/nasa-eclipse-path.ts`.
- Si les serveurs NASA sont indisponibles, la carte est masquée et un message explicite est affiché.
- Les résultats d'éclipses et de transits sont mis en cache côté serveur par zone de `0.5° x 0.5°` avec les primitives de cache de Next.js 16 ; la recherche des transits est ancrée au jour UTC courant, ce qui garde la clé de cache stable sur la journée.
- Les semaines lunaire et solaire sont calculées à partir du minuit local envoyé par le client, pour que les jours correspondent au calendrier du visiteur.
- Chaque lever de Soleil est apparié au coucher qui le suit, et non à celui du même jour civil, pour que la durée du jour reste correcte aux hautes latitudes.
- Les altitudes du Soleil sont corrigées de la réfraction atmosphérique.
- `app/components/three/stage.ts` regroupe le socle Three.js réutilisable : rendu, caméra, contrôles, calque de libellés HTML, redimensionnement et boucle de rendu mise en pause hors écran.
- Three.js est chargé via `next/dynamic` avec `ssr: false`, pour rester hors du bundle initial et du rendu serveur.
- Les orbites sont construites à partir des deux apsides réelles : demi-grand axe `a = (r_péri + r_apo) / 2` et excentricité `e = (r_apo − r_péri) / (r_apo + r_péri)`.
- La position d'un corps sur son orbite est donnée par son anomalie vraie, mesurée comme l'écart entre sa longitude écliptique actuelle et celle qu'il aura au prochain périapse, et par sa distance mesurée. Le corps est donc placé en coordonnées polaires réelles, pas sur l'ellipse idéalisée : l'écart résiduel est d'environ 1 % du demi-grand axe pour la Lune, dont l'orbite est fortement perturbée, et de 0,01 % pour la Terre.
- Le sens de parcours est antihoraire vu du nord de l'écliptique, d'où le signe négatif sur Z dans `positionAt`.
- Le ciel du soir est un empilement de trois rotations : précession J2000 → équateur de la date (fixe pour la nuit), rotation de `−TSL` autour de l'axe des pôles (ce que déplace le curseur), puis inclinaison à la latitude de l'observateur. Les axes de la scène sont X = est, Y = zénith, Z = sud.
- Le temps sidéral n'est calculé côté serveur qu'une fois, au début de la nuit ; le navigateur l'extrapole au rythme sidéral, ce qui évite d'embarquer une éphéméride dans le bundle.
- Comme le catalogue est en J2000 et la scène en équateur de la date, la matrice de précession est prise au milieu de la nuit : elle bouge de moins d'une seconde d'arc en une nuit.
- `check:sky` rejoue ces rotations en arithmétique simple et compare à la conversion équatorial → horizontal d'astronomy-engine, sur 40 étoiles × 5 instants × 2 hémisphères.
- Les figures des constellations viennent de d3-celestial, dont les coordonnées sont en J2000 comme le catalogue HYG : `check:sky` vérifie que chaque sommet tombe bien sur une étoile dessinée, le pire étant à 0,009°.
- La Lune et les planètes se déplacent par rapport aux étoiles et ne peuvent donc pas suivre la seule rotation. Le serveur échantillonne 9 positions par nuit et le navigateur interpole entre elles en normalisant les directions ; `check:sky` compare cette interpolation à la position réelle hors des points d'échantillonnage, l'écart maximal étant de 0,016° pour la Lune.
- Les positions des planètes sont topocentriques, ce qui compte pour la Lune dont la parallaxe atteint un degré.

## Fichiers principaux

- `app/page.tsx`
- `app/components/SkyApp.tsx`
- `app/components/LocationPicker.tsx`
- `app/components/ApodApp.tsx`
- `app/components/WeatherApp.tsx`
- `app/components/WeatherIcon.tsx`
- `app/components/EclipsesApp.tsx`
- `app/components/EclipseCard.tsx`
- `app/components/EclipseMap.tsx`
- `app/components/MoonPhasesApp.tsx`
- `app/components/MoonDisc.tsx`
- `app/components/SunApp.tsx`
- `app/components/SunArc.tsx`
- `app/components/ApsidesApp.tsx`
- `app/components/OrbitScene.tsx`
- `app/components/NightSkyApp.tsx`
- `app/components/StarSphere.tsx`
- `app/components/TransitsApp.tsx`
- `app/components/TransitDisc.tsx`
- `app/components/three/stage.ts`
- `app/components/formatters.ts`
- `app/actions/apod.ts`
- `app/actions/eclipses.ts`
- `app/actions/moon.ts`
- `app/actions/sun.ts`
- `app/actions/apsides.ts`
- `app/actions/sky.ts`
- `app/actions/transits.ts`
- `app/actions/weather.ts`
- `lib/apod.ts`
- `lib/eclipses.ts`
- `lib/moon.ts`
- `lib/sun.ts`
- `lib/apsides.ts`
- `lib/sky.ts`
- `lib/transits.ts`
- `lib/weather.ts`
- `lib/sidereal.ts`
- `lib/star-catalogue.ts`
- `lib/constellations.ts`
- `lib/nasa-eclipse-path.ts`
- `public/stars.json`
- `public/constellations.json`

## Crédits données

- Éphémérides : [astronomy-engine](https://github.com/cosinekitty/astronomy)
- Photo du jour : [Astronomy Picture of the Day](https://apod.nasa.gov/apod/) via [api.nasa.gov](https://api.nasa.gov)
- Météo : [OpenWeatherMap](https://openweathermap.org), API 2.5 (relevé courant et prévision à 5 jours)
- Trajectoires d'éclipses : tables NASA GSFC `SEpath`
- Étoiles : [HYG Database v4.1](https://github.com/astronexus/HYG-Database) (astronexus), CC BY-SA 4.0
- Figures et noms des constellations : [d3-celestial](https://github.com/ofrohn/d3-celestial) (Olaf Frohn), BSD 3-Clause
- Géocodage et fonds de carte : Nominatim / OpenStreetMap, CARTO
