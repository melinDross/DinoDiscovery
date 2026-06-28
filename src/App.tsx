import { useState } from 'react';
import { AttributeGroup } from './components/AttributeGroup';
import { DiscovererForm } from './components/DiscovererForm';
import { DiscoverButton } from './components/DiscoverButton';
import { SIZES, HABITATS, DIETS, FEATURES, PERSONALITIES } from './data/attributes';
import { isSelectionComplete } from './validation';
import type { Size, Habitat, Diet, Feature, Personality } from '../shared/types';

export default function App() {
  const [size, setSize] = useState<Size | null>(null);
  const [habitat, setHabitat] = useState<Habitat | null>(null);
  const [diet, setDiet] = useState<Diet | null>(null);
  const [feature, setFeature] = useState<Feature | null>(null);
  const [personality, setPersonality] = useState<Personality | null>(null);
  const [discovererName, setDiscovererName] = useState('');

  const canDiscover = isSelectionComplete(
    { size, habitat, diet, feature, personality },
    discovererName
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-100 to-blue-100 p-4">
      <h1 className="text-3xl font-bold text-center text-purple-700 mb-6">
        Generador de Descubrimiento de Dinosaurios
      </h1>
      <div className="max-w-2xl mx-auto">
        <AttributeGroup label="Tamaño" options={SIZES} selected={size} onSelect={setSize} />
        <AttributeGroup label="Hábitat" options={HABITATS} selected={habitat} onSelect={setHabitat} />
        <AttributeGroup label="Dieta" options={DIETS} selected={diet} onSelect={setDiet} />
        <AttributeGroup
          label="Característica especial"
          options={FEATURES}
          selected={feature}
          onSelect={setFeature}
        />
        <AttributeGroup
          label="Personalidad"
          options={PERSONALITIES}
          selected={personality}
          onSelect={setPersonality}
        />
        <DiscovererForm value={discovererName} onChange={setDiscovererName} />
        <DiscoverButton disabled={!canDiscover} onClick={() => {}} />
      </div>
    </main>
  );
}
