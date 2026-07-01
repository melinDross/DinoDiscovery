import { playClickSound } from '../sound';
import { ATTRIBUTE_MEDALLION_PATHS } from '../data/cardTheme';

interface AttributeGroupProps<T extends string> {
  label: string;
  description?: string;
  options: T[];
  selected: T | null;
  onSelect: (value: T) => void;
}

export function AttributeGroup<T extends string>({
  label,
  description,
  options,
  selected,
  onSelect,
}: AttributeGroupProps<T>) {
  return (
    <div className="mb-6">
      <h3 className="font-display2 font-semibold text-2xl sm:text-3xl text-cream mb-3 sm:mb-4 uppercase tracking-wide text-center">
        {label}
      </h3>
      {description && (
        <p className="text-sage text-sm text-center mb-3 sm:mb-4 italic">{description}</p>
      )}
      <div className="flex flex-wrap gap-2 sm:gap-3 justify-center">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => {
              playClickSound();
              onSelect(option);
            }}
            aria-pressed={selected === option}
            aria-label={option}
            className={`flex flex-col items-center justify-center gap-1.5 sm:gap-2 px-2 py-3 sm:px-3 sm:py-4 w-[112px] sm:w-[140px] min-h-[44px] border rounded-2xl transition-colors ${
              selected === option
                ? 'bg-brand/[0.12] border-brand shadow-[0_0_20px_rgba(236,26,143,0.3)]'
                : 'bg-brand/5 border-brand/20 hover:border-brand/50'
            }`}
          >
            <img
              src={ATTRIBUTE_MEDALLION_PATHS[option] ?? ''}
              alt=""
              aria-hidden="true"
              className="max-w-none w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl pointer-events-none"
            />
            <span className="font-display2 font-semibold text-cream uppercase tracking-wide text-sm sm:text-base">
              {option}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
