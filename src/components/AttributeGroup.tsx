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
            className={`flex flex-col items-center justify-center gap-1.5 sm:gap-2 px-3 py-3 sm:px-5 sm:py-4 w-[104px] sm:w-[130px] min-h-[44px] border rounded-[999px] transition-colors ${
              selected === option
                ? 'bg-brand/[0.12] border-brand shadow-[0_0_20px_rgba(236,26,143,0.3)]'
                : 'bg-brand/5 border-brand/20 hover:border-brand/50'
            }`}
          >
            <img
              src={ATTRIBUTE_MEDALLION_PATHS[option] ?? ''}
              alt=""
              aria-hidden="true"
              className="max-w-none w-10 h-10 sm:w-12 sm:h-12 object-cover rounded-[999px] pointer-events-none"
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
