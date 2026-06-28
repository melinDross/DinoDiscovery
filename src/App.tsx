import { useEffect, useRef, useState } from 'react';
import { AttributeGroup } from './components/AttributeGroup';
import { DiscovererForm } from './components/DiscovererForm';
import { DiscoverButton } from './components/DiscoverButton';
import { LoadingDino } from './components/LoadingDino';
import { ResultScreen } from './components/ResultScreen';
import { EmailGateModal } from './components/EmailGateModal';
import { Certificate } from './components/Certificate';
import { SIZES, HABITATS, DIETS, FEATURES, PERSONALITIES } from './data/attributes';
import { isSelectionComplete } from './validation';
import { generateDino, RateLimitError, DinoApiError } from './api';
import { saveEmail } from './emailStore';
import { captureCertificateAsPng } from './certificate';
import { captureAdminKeyFromUrl } from './adminAuth';
import type {
  Size,
  Habitat,
  Diet,
  Feature,
  Personality,
  GenerateDinoResponse,
} from '../shared/types';

type FlowState = 'idle' | 'loading' | 'result' | 'error';

export default function App() {
  const [size, setSize] = useState<Size | null>(null);
  const [habitat, setHabitat] = useState<Habitat | null>(null);
  const [diet, setDiet] = useState<Diet | null>(null);
  const [feature, setFeature] = useState<Feature | null>(null);
  const [personality, setPersonality] = useState<Personality | null>(null);
  const [discovererName, setDiscovererName] = useState('');

  const [flowState, setFlowState] = useState<FlowState>('idle');
  const [result, setResult] = useState<GenerateDinoResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [showEmailGate, setShowEmailGate] = useState(false);

  const certificateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    captureAdminKeyFromUrl();
  }, []);

  const partial = { size, habitat, diet, feature, personality };
  const canDiscover = isSelectionComplete(partial, discovererName);

  async function handleDiscover() {
    if (!isSelectionComplete(partial, discovererName)) return;
    setFlowState('loading');
    try {
      const response = await generateDino({ ...partial, discovererName });
      setResult(response);
      setFlowState('result');
    } catch (err) {
      if (err instanceof RateLimitError) {
        const minutes = Math.ceil(err.retryAfterSeconds / 60);
        setErrorMessage(`¡Has descubierto muchos dinosaurios hoy! Vuelve en unos ${minutes} minutos.`);
      } else if (err instanceof DinoApiError) {
        setErrorMessage('¡El dinosaurio se escapó! Inténtalo de nuevo.');
      } else {
        setErrorMessage('Algo salió mal. Inténtalo de nuevo.');
      }
      setFlowState('error');
    }
  }

  async function handleEmailConfirm(email: string) {
    saveEmail(email);
    setShowEmailGate(false);
    if (certificateRef.current && result) {
      await captureCertificateAsPng(
        certificateRef.current,
        `certificado-${result.commonName.toLowerCase().replace(/\s+/g, '-')}.png`
      );
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-100 to-blue-100 p-4">
      <h1 className="text-3xl font-bold text-center text-purple-700 mb-6">
        Generador de Descubrimiento de Dinosaurios
      </h1>

      {flowState === 'idle' && (
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
          <DiscoverButton disabled={!canDiscover} onClick={handleDiscover} />
        </div>
      )}

      {flowState === 'loading' && <LoadingDino />}

      {flowState === 'error' && (
        <div className="max-w-md mx-auto text-center">
          <p className="text-red-700 font-semibold mb-4">{errorMessage}</p>
          <button
            type="button"
            onClick={() => setFlowState('idle')}
            className="px-6 py-3 rounded-full bg-purple-600 text-white font-bold"
          >
            Volver a intentar
          </button>
        </div>
      )}

      {flowState === 'result' && result && (
        <>
          <ResultScreen result={result} onDownloadClick={() => setShowEmailGate(true)} />
          <div className="fixed -left-[9999px] top-0" aria-hidden="true">
            <Certificate ref={certificateRef} discovererName={discovererName} result={result} />
          </div>
        </>
      )}

      {showEmailGate && (
        <EmailGateModal onConfirm={handleEmailConfirm} onCancel={() => setShowEmailGate(false)} />
      )}
    </main>
  );
}
