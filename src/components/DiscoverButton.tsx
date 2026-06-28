interface DiscoverButtonProps {
  disabled: boolean;
  onClick: () => void;
}

export function DiscoverButton({ disabled, onClick }: DiscoverButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="w-full max-w-sm px-6 py-3 rounded-full text-white font-bold text-lg bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
    >
      ¡Descubrir mi dinosaurio!
    </button>
  );
}
