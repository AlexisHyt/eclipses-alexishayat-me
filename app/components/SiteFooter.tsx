"use client";

import { useI18n } from "@/app/i18n/context";

export default function SiteFooter() {
  const { t } = useI18n();

  return (
    <footer className="relative z-10 pb-6 text-center text-xs text-white/20">
      sky.alexishayat.me · {t.footer.dataVia}{" "}
      <a
        href="https://github.com/cosinekitty/astronomy"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:text-white/40"
      >
        astronomy-engine
      </a>
    </footer>
  );
}
