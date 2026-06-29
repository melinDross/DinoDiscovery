const OPTION_EMOJIS: Record<string, string> = {
  Pequeño: '🐭',
  Mediano: '🦎',
  Gigante: '🦕',
  Selva: '🌴',
  Desierto: '🏜️',
  Océano: '🌊',
  Montaña: '🏔️',
  Volcán: '🌋',
  Carnívoro: '🥩',
  Herbívoro: '🌿',
  Omnívoro: '🍖',
  Cuernos: '🦄',
  Alas: '🦅',
  'Escamas coloridas': '✨',
  'Cola poderosa': '💥',
  Armadura: '🛡️',
  'Súper garras': '⚡',
  Feroz: '😤',
  Amigable: '😊',
  Veloz: '⚡',
  Sigiloso: '🥷',
};

interface AttributeGroupProps<T extends string> {
  label: string;
  options: T[];
  selected: T | null;
  onSelect: (value: T) => void;
}

export function AttributeGroup<T extends string>({
  label,
  options,
  selected,
  onSelect,
}: AttributeGroupProps<T>) {
  return (
    <div className="mb-6">
      <h3 className="font-display text-2xl text-cream mb-4 uppercase tracking-wide text-center">
        {label}
      </h3>
      <div className="flex flex-wrap gap-3 justify-center">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(option)}
            aria-pressed={selected === option}
            aria-label={option}
            className={`flex flex-col items-center gap-2 px-5 py-4 min-w-[110px] border transition-colors ${
              selected === option
                ? 'bg-accent/[0.12] border-accent shadow-[0_0_20px_rgba(178,255,0,0.3)]'
                : 'bg-accent/5 border-accent/20 hover:border-accent/50'
            }`}
          >
            <span className="text-3xl" aria-hidden="true">
              {OPTION_EMOJIS[option] ?? ''}
            </span>
            <span className="font-display text-cream uppercase tracking-wide">{option}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
