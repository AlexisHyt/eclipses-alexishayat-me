# Sky

Application Next.js 16 qui rassemble plusieurs outils d'observation du ciel, organisés en onglets autour d'un **emplacement commun à toute la page**.

## Onglets

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
```

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

- Chaque domaine a sa bibliothèque de calcul : `lib/eclipses.ts`, `lib/moon.ts`, `lib/sun.ts` et `lib/apsides.ts`.
- La pagination mondiale des éclipses totales est calculée côté serveur depuis `SearchGlobalSolarEclipse` / `NextGlobalSolarEclipse`.
- Les trajectoires sont extraites des tables NASA GSFC `SEpath` (lignes centrales à intervalles de 120 s) via `lib/nasa-eclipse-path.ts`.
- Si les serveurs NASA sont indisponibles, la carte est masquée et un message explicite est affiché.
- Les résultats d'éclipses sont mis en cache côté serveur par zone de `0.5° x 0.5°` avec les primitives de cache de Next.js 16.
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
- `app/components/three/stage.ts`
- `app/components/formatters.ts`
- `app/actions/eclipses.ts`
- `app/actions/moon.ts`
- `app/actions/sun.ts`
- `app/actions/apsides.ts`
- `app/actions/sky.ts`
- `lib/eclipses.ts`
- `lib/moon.ts`
- `lib/sun.ts`
- `lib/apsides.ts`
- `lib/sky.ts`
- `lib/sidereal.ts`
- `lib/star-catalogue.ts`
- `lib/constellations.ts`
- `lib/nasa-eclipse-path.ts`
- `public/stars.json`
- `public/constellations.json`

## Crédits données

- Éphémérides : [astronomy-engine](https://github.com/cosinekitty/astronomy)
- Trajectoires d'éclipses : tables NASA GSFC `SEpath`
- Étoiles : [HYG Database v4.1](https://github.com/astronexus/HYG-Database) (astronexus), CC BY-SA 4.0
- Figures et noms des constellations : [d3-celestial](https://github.com/ofrohn/d3-celestial) (Olaf Frohn), BSD 3-Clause
- Géocodage et fonds de carte : Nominatim / OpenStreetMap, CARTO
