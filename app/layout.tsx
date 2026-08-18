import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sky",
  description:
    "Sky réunit les prochaines éclipses solaires visibles depuis votre position, les phases de la Lune, le lever et le coucher du Soleil, ainsi que les prochains périgées et périhélies, calculés en temps réel.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#07070f] text-white">
        {children}
      </body>
    </html>
  );
}
