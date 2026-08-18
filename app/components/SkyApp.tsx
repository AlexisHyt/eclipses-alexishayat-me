"use client";

import { useState } from "react";
import { useI18n } from "@/app/i18n/context";
import ApodApp from "./ApodApp";
import ApsidesApp from "./ApsidesApp";
import EclipsesApp from "./EclipsesApp";
import LocationPicker, { type Location } from "./LocationPicker";
import MoonPhasesApp from "./MoonPhasesApp";
import NightSkyApp from "./NightSkyApp";
import SunApp from "./SunApp";
import TransitsApp from "./TransitsApp";
import WeatherApp from "./WeatherApp";

type Tab =
  | "apod"
  | "weather"
  | "eclipses"
  | "moon"
  | "sun"
  | "apsides"
  | "night"
  | "transits";

const TABS: { id: Tab; icon: string }[] = [
  { id: "apod", icon: "📷" },
  { id: "weather", icon: "🌦️" },
  { id: "eclipses", icon: "🌑" },
  { id: "moon", icon: "🌗" },
  { id: "sun", icon: "☀️" },
  { id: "apsides", icon: "📏" },
  { id: "night", icon: "✨" },
  { id: "transits", icon: "🔭" },
];

export default function SkyApp() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("apod");
  const [location, setLocation] = useState<Location | null>(null);

  return (
    <div className="flex flex-col gap-8">
      {/* Location, shared by every tab */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40">
          {t.location.title}
        </h2>
        <LocationPicker
          onLocationChange={setLocation}
          currentLocation={location}
        />
      </section>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label={t.tabs.label}
        className="flex flex-wrap gap-1 border-b border-white/8"
      >
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls={`panel-${item.id}`}
            onClick={() => setTab(item.id)}
            className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap cursor-pointer transition ${
              tab === item.id
                ? "border-indigo-400 text-white"
                : "border-transparent text-white/50 hover:text-white/80"
            }`}
          >
            <span aria-hidden>{item.icon}</span>
            {t.tabs[item.id]}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
        key={tab}
      >
        {tab === "apod" && <ApodApp />}
        {tab === "weather" && <WeatherApp location={location} />}
        {tab === "eclipses" && <EclipsesApp location={location} />}
        {tab === "moon" && <MoonPhasesApp location={location} />}
        {tab === "sun" && <SunApp location={location} />}
        {tab === "apsides" && <ApsidesApp />}
        {tab === "night" && <NightSkyApp location={location} />}
        {tab === "transits" && <TransitsApp location={location} />}
      </div>
    </div>
  );
}
