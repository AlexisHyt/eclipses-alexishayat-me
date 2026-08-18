"use client";

import { useI18n } from "@/app/i18n/context";
import LanguageSelect from "./LanguageSelect";

export default function SiteHeader() {
  const { t } = useI18n();

  return (
    <header className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <img
          src="icon.svg"
          alt={t.header.iconAlt}
          className="text-4xl"
          aria-hidden
        />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Sky</h1>
          <p className="text-sm text-white/50">{t.header.subtitle}</p>
        </div>
      </div>

      <LanguageSelect />
    </header>
  );
}
