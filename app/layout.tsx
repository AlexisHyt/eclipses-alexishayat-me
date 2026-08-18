import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LocaleProvider } from "./i18n/context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const description =
  "Sky réunit les prochaines éclipses solaires, les phases de la Lune, le lever et le coucher du Soleil, les périgées et périhélies à venir, ainsi que le ciel du soir visible depuis votre position, calculés en temps réel.";

export const metadata: Metadata = {
  metadataBase: new URL("https://sky.alexishayat.me"),
  title: "Sky — Le ciel, depuis chez vous",
  description,
  applicationName: "Sky",
  keywords: [
    "astronomie",
    "éclipse solaire",
    "phases de la Lune",
    "lever du Soleil",
    "coucher du Soleil",
    "périgée",
    "périhélie",
    "ciel du soir",
  ],
  openGraph: {
    title: "Sky — Le ciel, depuis chez vous",
    description,
    url: "https://sky.alexishayat.me",
    siteName: "Sky",
    locale: "fr_FR",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#07070f",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#07070f] text-white">
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
