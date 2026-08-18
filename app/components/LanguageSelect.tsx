"use client";

import { useI18n } from "@/app/i18n/context";
import { isLocale, LOCALE_NAMES, LOCALES } from "@/app/i18n/dictionaries";

export default function LanguageSelect() {
  const { locale, setLocale, t } = useI18n();

  return (
    <select
      value={locale}
      onChange={(event) => {
        if (isLocale(event.target.value)) setLocale(event.target.value);
      }}
      aria-label={t.language.label}
      title={t.language.label}
      className="cursor-pointer rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/70 outline-none transition hover:border-white/20 hover:bg-white/10 focus:border-indigo-400/60 focus:ring-1 focus:ring-indigo-400/40"
    >
      {LOCALES.map((option) => (
        <option key={option} value={option} className="bg-[#0f0f1a] text-white">
          {LOCALE_NAMES[option]}
        </option>
      ))}
    </select>
  );
}
