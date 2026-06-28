interface LandingProps {
  onStart: () => void;
}

export function Landing({ onStart }: LandingProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
      <img
        src="/landing-logo.png"
        alt="Dino Discovery Generator"
        className="w-64 h-64 object-contain mb-4"
      />
      <h1 className="text-3xl font-bold text-purple-700">Dino Discovery Generator</h1>
      <p className="mt-2 text-lg text-gray-700">¡Crea tu propio dinosaurio único!</p>
      <button
        type="button"
        onClick={onStart}
        className="mt-8 w-full max-w-xs px-6 py-4 rounded-full text-white font-bold text-xl bg-green-600 hover:bg-green-700"
      >
        ¡Empezar!
      </button>
    </div>
  );
}
