interface NameStepProps {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
}

export function NameStep({ value, onChange, onNext }: NameStepProps) {
  const canContinue = value.trim().length > 0;

  return (
    <div className="text-center max-w-sm sm:max-w-md w-full">
      <h2 className="font-display2 font-semibold text-2xl sm:text-3xl text-cream mb-4 uppercase tracking-wide">
        ¿Cómo te llamas, descubridor/a?
      </h2>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Escribe tu nombre"
        aria-label="Tu nombre"
        className="w-full px-4 py-3 bg-bg border-2 border-brand/20 focus:outline-none focus:border-brand focus-visible:ring-2 focus-visible:ring-brand-light text-lg text-center text-cream placeholder:text-moss"
      />
      <button
        type="button"
        disabled={!canContinue}
        onClick={onNext}
        className="mt-6 w-full px-6 py-3 text-white font-display2 font-semibold text-lg uppercase tracking-wide rounded-[999px] bg-brand hover:shadow-[6px_6px_0_0_#f5e6c8] transition-shadow disabled:bg-[#3a3a3a] disabled:text-moss disabled:shadow-none disabled:cursor-not-allowed"
      >
        Siguiente
      </button>
    </div>
  );
}
