interface NameStepProps {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
}

export function NameStep({ value, onChange, onNext }: NameStepProps) {
  const canContinue = value.trim().length > 0;

  return (
    <div className="text-center max-w-sm w-full">
      <h2 className="font-display text-2xl text-cream mb-4 uppercase tracking-wide">
        ¿Cómo te llamas, descubridor/a?
      </h2>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Escribe tu nombre"
        aria-label="Tu nombre"
        className="w-full px-4 py-3 bg-bg border-2 border-accent/20 focus:outline-none focus:border-accent text-lg text-center text-cream placeholder:text-moss"
      />
      <button
        type="button"
        disabled={!canContinue}
        onClick={onNext}
        className="mt-6 w-full px-6 py-3 text-bg font-display text-lg uppercase tracking-wide bg-accent hover:shadow-[6px_6px_0_0_#f5e6c8] transition-shadow disabled:bg-[#3a3a3a] disabled:text-moss disabled:shadow-none disabled:cursor-not-allowed"
      >
        Siguiente
      </button>
    </div>
  );
}
