# Éclipses solaires

Application Next.js 16 qui liste les **20 prochaines éclipses solaires visibles** depuis un emplacement donné.

## Fonctionnalités

- recherche d'emplacement via **Nominatim / OpenStreetMap**
- bouton **Ma position** via la Geolocation API
- calcul des prochaines éclipses visibles avec **astronomy-engine**
- prise en charge des éclipses **partielles**, **annulaires** et **totales**
- carte **Leaflet** inline dans chaque carte d'éclipse
- filtrage des éclipses réellement visibles localement (soleil au-dessus de l'horizon pendant au moins une phase)

## Stack

- `next@16`
- `react@19`
- `astronomy-engine`
- `leaflet`
- `tailwindcss@4`
- `bun`

## Lancer en local

```powershell
cd E:\___SITES___\eclipses.alexishayat.me
bun install
bun run dev
```

Ouvrir ensuite `http://localhost:3000`.

## Vérifier les calculs

Le projet contient un petit script qui calcule les éclipses visibles depuis Paris et vérifie quelques invariants simples.

```powershell
cd E:\___SITES___\eclipses.alexishayat.me
bun run check:eclipses
bun run check:nasa
```

## Build de production

```powershell
cd E:\___SITES___\eclipses.alexishayat.me
bun run build
```

## Notes techniques

- Les calculs astronomiques sont faits dans `lib/eclipses.ts`.
- Les trajectoires sont extraites des tables NASA GSFC `SEpath` (lignes centrales à intervalles de 120 s) via `lib/nasa-eclipse-path.ts`.
- Si les serveurs NASA sont indisponibles, la carte est masquée et un message explicite est affiché.
- Les résultats sont mis en cache côté serveur par zone de `0.5° x 0.5°` avec les primitives de cache de Next.js 16.

## Fichiers principaux

- `app/page.tsx`
- `app/components/EclipsesApp.tsx`
- `app/components/LocationPicker.tsx`
- `app/components/EclipseCard.tsx`
- `app/components/EclipseMap.tsx`
- `app/actions/eclipses.ts`
- `lib/eclipses.ts`
- `lib/nasa-eclipse-path.ts`
