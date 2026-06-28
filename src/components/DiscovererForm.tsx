interface DiscovererFormProps {
  value: string;
  onChange: (value: string) => void;
}

export function DiscovererForm({ value, onChange }: DiscovererFormProps) {
  return (
    <div className="mb-6">
      <label htmlFor="discoverer-name" className="block text-lg font-bold mb-2 text-purple-700">
        Tu nombre de descubridor/a
      </label>
      <input
        id="discoverer-name"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Escribe tu nombre"
        className="w-full max-w-sm px-4 py-2 rounded-lg border-2 border-purple-300 focus:outline-none focus:border-purple-600"
      />
    </div>
  );
}
