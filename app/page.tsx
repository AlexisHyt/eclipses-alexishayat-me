import SiteFooter from "./components/SiteFooter";
import SiteHeader from "./components/SiteHeader";
import SkyApp from "./components/SkyApp";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center bg-[#07070f]">
      {/* Stars background */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_#1a1040_0%,_#07070f_70%)]" />

      <main className="relative z-10 flex w-full max-w-4xl flex-col gap-10 px-4 py-12 sm:px-6">
        {/* Hero */}
        <SiteHeader />

        {/* App */}
        <SkyApp />
      </main>

      <SiteFooter />
    </div>
  );
}
