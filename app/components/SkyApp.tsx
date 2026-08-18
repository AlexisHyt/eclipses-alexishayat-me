"use client";

import { useState } from "react";
import ApsidesApp from "./ApsidesApp";
import EclipsesApp from "./EclipsesApp";
import LocationPicker, { type Location } from "./LocationPicker";
import MoonPhasesApp from "./MoonPhasesApp";
import NightSkyApp from "./NightSkyApp";
import SunApp from "./SunApp";

type Tab = "eclipses" | "moon" | "sun" | "apsides" | "night";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "eclipses", label: "Éclipses", icon: "🌑" },
  { id: "moon", label: "Phases de Lune", icon: "🌗" },
  { id: "sun", label: "Soleil", icon: "☀️" },
  { id: "apsides", label: "Apsides", icon: "📏" },
  { id: "night", label: "Ciel du soir", icon: "✨" },
];

export default function SkyApp() {
  const [tab, setTab] = useState<Tab>("eclipses");
  const [location, setLocation] = useState<Location | null>(null);

  return (
    <div className="flex flex-col gap-8">
      {/* Location, shared by every tab */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40">
          Votre emplacement
        </h2>
        <LocationPicker
          onLocationChange={setLocation}
          currentLocation={location}
        />
      </section>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Sections"
        className="flex flex-wrap gap-1 border-b border-white/8"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition ${
              tab === t.id
                ? "border-indigo-400 text-white"
                : "border-transparent text-white/50 hover:text-white/80"
            }`}
          >
            <span aria-hidden>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
        key={tab}
      >
        {tab === "eclipses" && <EclipsesApp location={location} />}
        {tab === "moon" && <MoonPhasesApp location={location} />}
        {tab === "sun" && <SunApp location={location} />}
        {tab === "apsides" && <ApsidesApp />}
        {tab === "night" && <NightSkyApp location={location} />}
      </div>
    </div>
  );
}
