interface LandingProps {
  onStart: () => void;
}

export function Landing({ onStart }: LandingProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
      <div className="relative mb-3 sm:mb-4 w-52 sm:w-72 md:w-80 rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(178,255,0,0.20),0_8px_32px_rgba(0,0,0,0.6)] ring-2 ring-accent/30">
        <video
          src="/dino-landing.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-auto block"
        />
      </div>
<h1 className="font-display text-4xl sm:text-5xl md:text-6xl leading-tight tracking-[5px] uppercase">
        <span className="block text-cream">Dino</span>
        <span className="block text-accent [text-shadow:0_0_40px_rgba(178,255,0,0.4)]">
          Discovery
        </span>
      </h1>
      <p className="mt-3 sm:mt-4 text-sm sm:text-base uppercase tracking-[2px] text-sage">
        Detecta tu propia especie única
      </p>
      <button
        type="button"
        onClick={onStart}
        className="mt-6 sm:mt-8 w-full max-w-xs sm:max-w-sm px-6 py-3 sm:py-4 text-bg font-display text-xl uppercase tracking-[2px] bg-accent hover:shadow-[6px_6px_0_0_#f5e6c8] transition-shadow"
      >
        ¡Empezar!
      </button>
    </div>
  );
}
