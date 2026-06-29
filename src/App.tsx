import { useEffect, useRef, useState } from 'react';
import { Landing } from './components/Landing';
import { WizardShell } from './components/WizardShell';
import { NameStep } from './components/NameStep';
import { AttributeGroup } from './components/AttributeGroup';
import { LoadingDino } from './components/LoadingDino';
import { ResultScreen } from './components/ResultScreen';
import { EmailGateModal } from './components/EmailGateModal';
import { Certificate } from './components/Certificate';
import { SIZES, HABITATS, DIETS, FEATURES, PERSONALITIES } from './data/attributes';
import { isSelectionComplete } from './validation';
import { generateDino, subscribeEmail, fetchResult, RateLimitError, DinoApiError } from './api';
import { captureCertificateAsPng } from './certificate';
import { captureAdminKeyFromUrl } from './adminAuth';
import type {
  Size,
  Habitat,
  Diet,
  Feature,
  Personality,
  DinoAttributes,
  GenerateDinoResponse,
} from '../shared/types';

type FlowState = 'landing' | 'wizard' | 'loading' | 'result' | 'error';

const TOTAL_WIZARD_STEPS = 6;
const AUTO_ADVANCE_DELAY_MS = 500;

function getResultIdFromUrl(): string | null {
  const match = window.location.pathname.match(/^\/r\/([^/]+)$/);
  return match ? match[1] : null;
}

export default function App() {
  const [size, setSize] = useState<Size | null>(null);
  const [habitat, setHabitat] = useState<Habitat | null>(null);
  const [diet, setDiet] = useState<Diet | null>(null);
  const [feature, setFeature] = useState<Feature | null>(null);
  const [personality, setPersonality] = useState<Personality | null>(null);
  const [discovererName, setDiscovererName] = useState('');

  const [flowState, setFlowState] = useState<FlowState>('landing');
  const [wizardStep, setWizardStep] = useState(0);
  const [result, setResult] = useState<GenerateDinoResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [showEmailGate, setShowEmailGate] = useState(false);
  const [isDiscoveryDone, setIsDiscoveryDone] = useState(false);

  const certificateRef = useRef<HTMLDivElement>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    captureAdminKeyFromUrl();

    const resultId = getResultIdFromUrl();
    if (resultId) {
      void loadResultFromUrl(resultId);
    }

    return () => {
      if (advanceTimerRef.current !== null) {
        clearTimeout(advanceTimerRef.current);
      }
    };
  }, []);

  async function loadResultFromUrl(resultId: string) {
    const fetched = await fetchResult(resultId);
    if (!fetched) {
      setErrorMessage('Este descubrimiento ya no está disponible.');
      setFlowState('error');
      return;
    }
    setDiscovererName(fetched.discovererName);
    setResult({
      resultId,
      scientificName: fetched.scientificName,
      commonName: fetched.commonName,
      description: fetched.description,
      imageUrl: fetched.imageUrl,
    });
    setFlowState('result');
  }

  function clearPendingAdvance() {
    if (advanceTimerRef.current !== null) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }

  function scheduleAdvance(action: () => void) {
    clearPendingAdvance();
    advanceTimerRef.current = setTimeout(() => {
      advanceTimerRef.current = null;
      action();
    }, AUTO_ADVANCE_DELAY_MS);
  }

  async function handleDiscover(attrs: DinoAttributes, name: string) {
    setFlowState('loading');
    setIsDiscoveryDone(false);
    try {
      const response = await generateDino({ ...attrs, discovererName: name });
      setResult(response);
      window.history.pushState(null, '', `/r/${response.resultId}`);
    } catch (err) {
      if (err instanceof RateLimitError) {
        const minutes = Math.ceil(err.retryAfterSeconds / 60);
        setErrorMessage(`¡Has descubierto muchos dinosaurios hoy! Vuelve en unos ${minutes} minutos.`);
      } else if (err instanceof DinoApiError) {
        setErrorMessage('¡El dinosaurio se escapó! Inténtalo de nuevo.');
      } else {
        setErrorMessage('Algo salió mal. Inténtalo de nuevo.');
      }
      setResult(null);
    } finally {
      setIsDiscoveryDone(true);
    }
  }

  function handleLoadingTransitionEnd() {
    setFlowState(result ? 'result' : 'error');
  }

  function handleSizeSelect(value: Size) {
    setSize(value);
    scheduleAdvance(() => setWizardStep((step) => step + 1));
  }

  function handleHabitatSelect(value: Habitat) {
    setHabitat(value);
    scheduleAdvance(() => setWizardStep((step) => step + 1));
  }

  function handleDietSelect(value: Diet) {
    setDiet(value);
    scheduleAdvance(() => setWizardStep((step) => step + 1));
  }

  function handleFeatureSelect(value: Feature) {
    setFeature(value);
    scheduleAdvance(() => setWizardStep((step) => step + 1));
  }

  function handlePersonalitySelect(value: Personality) {
    setPersonality(value);
    const attempted = { size, habitat, diet, feature, personality: value };
    if (!isSelectionComplete(attempted, discovererName)) return;
    scheduleAdvance(() => {
      void handleDiscover(attempted, discovererName);
    });
  }

  function handleWizardBack(targetStep: number) {
    clearPendingAdvance();
    setWizardStep(targetStep);
  }

  function handleBackToLanding() {
    clearPendingAdvance();
    setFlowState('landing');
  }

  function handleRestart() {
    clearPendingAdvance();
    setSize(null);
    setHabitat(null);
    setDiet(null);
    setFeature(null);
    setPersonality(null);
    setDiscovererName('');
    setResult(null);
    setErrorMessage('');
    setIsDiscoveryDone(false);
    setWizardStep(0);
    setFlowState('landing');
    window.history.pushState(null, '', '/');
  }

  async function downloadCertificate() {
    if (certificateRef.current && result) {
      await captureCertificateAsPng(
        certificateRef.current,
        `certificado-${result.commonName.toLowerCase().replace(/\s+/g, '-')}.png`
      );
    }
  }

  async function handleEmailConfirm(email: string) {
    setShowEmailGate(false);
    if (result) {
      try {
        await subscribeEmail(result.resultId, email);
      } catch {
        // Captura del lead en Kit es best-effort: nunca debe bloquear la
        // descarga del certificado, que es el valor central para el niño.
      }
    }
    await downloadCertificate();
  }

  return (
    <main className="min-h-screen grid-overlay text-cream font-body">
      {flowState === 'landing' && <Landing onStart={() => setFlowState('wizard')} />}

      {flowState === 'wizard' && wizardStep === 0 && (
        <WizardShell step={1} totalSteps={TOTAL_WIZARD_STEPS} onBack={handleBackToLanding}>
          <NameStep
            value={discovererName}
            onChange={setDiscovererName}
            onNext={() => setWizardStep(1)}
          />
        </WizardShell>
      )}

      {flowState === 'wizard' && wizardStep === 1 && (
        <WizardShell step={2} totalSteps={TOTAL_WIZARD_STEPS} onBack={() => handleWizardBack(0)}>
          <AttributeGroup
            label="Tamaño"
            description="El escáner necesita más datos para identificar la especie..."
            options={SIZES}
            selected={size}
            onSelect={handleSizeSelect}
          />
        </WizardShell>
      )}

      {flowState === 'wizard' && wizardStep === 2 && (
        <WizardShell step={3} totalSteps={TOTAL_WIZARD_STEPS} onBack={() => handleWizardBack(1)}>
          <AttributeGroup
            label="Hábitat"
            description="El escáner necesita más datos para identificar la especie..."
            options={HABITATS}
            selected={habitat}
            onSelect={handleHabitatSelect}
          />
        </WizardShell>
      )}

      {flowState === 'wizard' && wizardStep === 3 && (
        <WizardShell step={4} totalSteps={TOTAL_WIZARD_STEPS} onBack={() => handleWizardBack(2)}>
          <AttributeGroup
            label="Dieta"
            description="El escáner necesita más datos para identificar la especie..."
            options={DIETS}
            selected={diet}
            onSelect={handleDietSelect}
          />
        </WizardShell>
      )}

      {flowState === 'wizard' && wizardStep === 4 && (
        <WizardShell step={5} totalSteps={TOTAL_WIZARD_STEPS} onBack={() => handleWizardBack(3)}>
          <AttributeGroup
            label="Característica especial"
            description="El escáner necesita más datos para identificar la especie..."
            options={FEATURES}
            selected={feature}
            onSelect={handleFeatureSelect}
          />
        </WizardShell>
      )}

      {flowState === 'wizard' && wizardStep === 5 && (
        <WizardShell step={6} totalSteps={TOTAL_WIZARD_STEPS} onBack={() => handleWizardBack(4)}>
          <AttributeGroup
            label="Personalidad"
            description="El escáner necesita más datos para identificar la especie..."
            options={PERSONALITIES}
            selected={personality}
            onSelect={handlePersonalitySelect}
          />
        </WizardShell>
      )}

      {flowState === 'loading' && (
        <LoadingDino isDone={isDiscoveryDone} onTransitionEnd={handleLoadingTransitionEnd} />
      )}

      {flowState === 'error' && (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
          <p className="text-cream font-semibold mb-4">{errorMessage}</p>
          <button
            type="button"
            onClick={() => {
              clearPendingAdvance();
              setWizardStep(0);
              setFlowState('wizard');
            }}
            className="px-6 py-3 bg-accent text-bg font-display uppercase tracking-wide"
          >
            Volver a intentar
          </button>
        </div>
      )}

      {flowState === 'result' && result && (
        <>
          <ResultScreen
            result={result}
            onDownloadClick={() => setShowEmailGate(true)}
            onRestart={handleRestart}
          />
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
