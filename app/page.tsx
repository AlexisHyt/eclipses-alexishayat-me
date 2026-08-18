import SkyApp from "./components/SkyApp";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center bg-[#07070f]">
      {/* Stars background */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_#1a1040_0%,_#07070f_70%)]" />

      <main className="relative z-10 flex w-full max-w-4xl flex-col gap-10 px-4 py-12 sm:px-6">
        {/* Hero */}
        <header className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="text-4xl" aria-hidden>
              🌌
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Sky
              </h1>
              <p className="text-sm text-white/50">
                Le ciel, depuis chez vous
              </p>
            </div>
          </div>
        </header>

        {/* App */}
        <SkyApp />
      </main>

      <footer className="relative z-10 pb-6 text-center text-xs text-white/20">
        sky.alexishayat.me · Données calculées via{" "}
        <a
          href="https://github.com/cosinekitty/astronomy"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-white/40"
        >
          astronomy-engine
        </a>
      </footer>
    </div>
  );
}
