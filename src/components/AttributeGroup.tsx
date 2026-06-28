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
      <h3 className="text-lg font-bold mb-2 text-purple-700">{label}</h3>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(option)}
            aria-pressed={selected === option}
            className={`px-4 py-2 rounded-full font-semibold border-2 transition-colors ${
              selected === option
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-white text-purple-700 border-purple-300 hover:bg-purple-100'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
