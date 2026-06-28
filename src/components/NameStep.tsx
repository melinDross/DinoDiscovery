interface NameStepProps {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
}

export function NameStep({ value, onChange, onNext }: NameStepProps) {
  const canContinue = value.trim().length > 0;

  return (
    <div className="text-center max-w-sm w-full">
      <h2 className="text-2xl font-bold text-purple-700 mb-4">
        ¿Cómo te llamas, descubridor/a?
      </h2>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Escribe tu nombre"
        aria-label="Tu nombre"
        className="w-full px-4 py-3 rounded-lg border-2 border-purple-300 focus:outline-none focus:border-purple-600 text-lg text-center"
      />
      <button
        type="button"
        disabled={!canContinue}
        onClick={onNext}
        className="mt-6 w-full px-6 py-3 rounded-full text-white font-bold text-lg bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        Siguiente
      </button>
    </div>
  );
}
