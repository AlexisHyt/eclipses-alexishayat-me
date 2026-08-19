# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

The import above pulls in breaking-changes warnings that `next dev` regenerates
into `AGENTS.md` on every run. Read the relevant guide under
`node_modules/next/dist/docs/` before writing Next.js code — this project runs
Next.js 16, whose APIs and conventions diverge from older training data
(notably `cacheComponents` / `"use cache"`, used throughout this codebase).

## What this is

Sky (`sky.alexishayat.me`) is a Next.js 16 app bundling several sky-observation
tools as tabs around one **location shared across the whole page**: Astronomy
Picture of the Day, weather, solar eclipses, Moon phases, Sun, apsides
(perigee/apogee, perihelion/aphelion), a 3D night sky, and Mercury/Venus solar
transits. `README.md` (in French) documents each tab's behavior and the
astronomical/technical reasoning in detail — read it before touching a tab's
logic, it explains *why* the math and caching are shaped the way they are.

## Commands

```powershell
bun install
bun run dev            # next dev
bun run build           # next build
bun run start           # next start
bun run lint             # biome check
bun run format           # biome format --write
```

There is no Jest/Vitest suite. Correctness is instead validated by standalone
scripts under `scripts/`, one per astronomical domain, run individually:

```powershell
bun run check:sun
bun run check:moon
bun run check:eclipses
bun run check:eclipses:global
bun run check:apsides
bun run check:sky
bun run check:transits
bun run check:nasa
bun run check:apod       # hits api.nasa.gov — needs network + NASA_API_KEY
bun run check:weather    # hits OpenWeatherMap — needs network + OPEN_WEATHER_API_KEY
```

`check:apod` and `check:weather` fail without network access or a valid key;
that's expected in a sandboxed environment, not a regression. A script can
also be run directly for a single case, e.g. `bun run scripts/check-sun.ts`.

`public/stars.json` and `public/constellations.json` are generated once and
committed, not rebuilt as part of `build`. Only regenerate them (rare) via:

```powershell
bun run build:stars
bun run build:constellations
```

### Environment

A local, untracked `.env` provides two server-only keys:

```
NASA_API_KEY=...
OPEN_WEATHER_API_KEY=...
```

Without them, only the affected tab (APOD, weather) degrades with an explicit
message — the rest of the site works normally. Never expose either key to the
client.

## Architecture

**Per-domain triad.** Every tab follows the same three-layer split, named
consistently by domain (`sun`, `moon`, `eclipses`, `apsides`, `sky`,
`transits`, `weather`, `apod`):

- `lib/<domain>.ts` — pure calculation, almost entirely built on
  `astronomy-engine`. No React, no Next.js.
- `app/actions/<domain>.ts` — the `"use server"` boundary: input validation,
  coordinate rounding, and `"use cache"` + `cacheLife(...)` wrapping around the
  `lib` call.
- `app/components/<Domain>App.tsx` (+ helper components) — the client UI.

When changing a tab's behavior, figure out which layer actually owns it
first — most of the interesting logic lives in `lib/`, not in the component.

**Location lifting.** `app/components/SkyApp.tsx` owns the single `location`
state and the active tab, and passes `location` down to every tab that needs
it (weather, eclipses, moon, sun, night sky, transits). APOD and apsides are
location-independent and ignore it. `LocationPicker.tsx` is the only place
that mutates it (search via Nominatim/OpenStreetMap, or the Geolocation API).

**Caching is grid-based, not per-request.** Server Actions round coordinates
to a grid (0.1° for weather, 0.5° for eclipses/transits) before calling the
cached inner function, so nearby visitors share one upstream call instead of
one each. Custom `cacheLife` profiles are declared in `next.config.ts`
(currently just `"weather"`, tuned to OpenWeatherMap's own ~10 min refresh and
metered free tier) — add a profile there rather than inventing ad hoc
revalidation windows.

**Typed result unions over thrown errors, at the `lib` boundary that talks to
a third-party API.** `lib/weather.ts` returns a discriminated result (data /
key rejected / service unreachable) instead of throwing, because Next.js
Server Actions swallow the message of thrown exceptions — a plain `throw`
there can't reach the UI. Follow that pattern for any new third-party
integration; simple validation in `app/actions/*.ts` (bad coordinates, bad
locale) can still throw.

**Three.js scenes** (`OrbitScene.tsx` for apsides, `StarSphere.tsx` for the
night sky) share rendering boilerplate — renderer, camera, controls, HTML
label layer, resize, pause-when-offscreen — via `app/components/three/stage.ts`.
Both are loaded with `next/dynamic({ ssr: false })` to keep Three.js out of
the initial bundle and server render.

**i18n.** `app/i18n/dictionaries.ts` defines French (`fr`) as the source
dictionary; `Dictionary` is inferred from it, so English (`en`) is
type-checked against its shape at compile time — adding a key means adding it
to both. The active locale lives in `localStorage`, read only after mount
(`app/i18n/context.tsx`'s `LocaleProvider`), so server and first client paint
are always French and hydration never mismatches. Components read strings via
`useI18n().t`, never hardcoded text; locale-aware number/date formatting goes
through `useFormatters()` (backed by `app/components/formatters.ts`), not
inline `Intl` calls or template strings.

**Styling.** Tailwind v4, imported directly in `app/globals.css` (`@import
"tailwindcss"` + `@theme inline`) — there is no `tailwind.config.*`. The site
is a fixed dark space theme; `dark` is a hardcoded class on `<html>` in
`app/layout.tsx`, not a user toggle.

**Code comments are in English; user-facing strings (dictionaries, thrown
validation messages) are in French**, matching the existing files — keep new
code consistent with whichever file you're editing.

Biome (`biome.json`) is the linter/formatter — no ESLint/Prettier config
exists or should be added.
