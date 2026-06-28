# Landing + Wizard Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current single-page attribute selection screen with a landing page and a 6-step wizard (name + 5 attributes, one screen at a time), without changing anything after generation starts (loading/result/error/email gate/certificate).

**Architecture:** Three new presentational components (`Landing`, `WizardShell`, `NameStep`) plus the existing `AttributeGroup` (unchanged) compose the new selection flow. `App.tsx` gains a `wizardStep` index and a `'landing' | 'wizard'` pair of flow states replacing the old single `'idle'` state. A one-off Node script generates the landing logo image via the OpenAI API and writes it to `public/`, where Vite serves it as a static asset.

**Tech Stack:** React, TypeScript, Tailwind CSS, Vitest + @testing-library/react (same as the rest of the project). No new dependencies.

## Global Constraints

- Wizard has exactly 6 screens: 1 (nombre) + 5 (tamaño, hábitat, dieta, característica especial, personalidad), in that order.
- Screens 2-6 (attribute steps) auto-advance to the next step 500ms after the user picks an option — no separate "Siguiente" button on those screens.
- Screen 1 (nombre) has an explicit "Siguiente" button, enabled only when the trimmed input is non-empty.
- Every wizard screen shows a progress bar reflecting `step / 6` and a back button. On screen 1, back navigates to the landing page. On screens 2-6, back navigates to the previous wizard step.
- Completing screen 6 (personalidad) triggers dino generation automatically — no separate "¡Descubrir mi dinosaurio!" button.
- On a generation error, "Volver a intentar" returns to wizard step 0 (not to the landing page), preserving all previously chosen attributes and the entered name.
- The landing logo image style is "cartoon amigable y redondeado": friendly smiling dinosaur, saturated colors (green/purple/orange), soft rounded shapes, flat children's-storybook illustration — generated with `gpt-image-2`, quality `low`, size `1024x1024` (same model/settings already used for in-app dino generation).
- `AttributeGroup.tsx` and its test are **not modified** — reused as-is inside each wizard attribute screen.
- Nothing after `generateDino` is called changes: loading, result screen, error screen copy, email gate, and certificate flow stay exactly as they are today.

---

## Task 1: WizardShell component

**Files:**
- Create: `src/components/WizardShell.tsx`
- Test: `src/components/WizardShell.test.tsx`

**Interfaces:**
- Consumes: nothing from prior tasks.
- Produces: `WizardShell({ step, totalSteps, onBack, children })` — used by Task 5 (App.tsx wiring) to wrap every wizard screen.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/WizardShell.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WizardShell } from './WizardShell';

describe('WizardShell', () => {
  it('renders a progress bar reflecting the current step out of the total', () => {
    render(
      <WizardShell step={2} totalSteps={6} onBack={() => {}}>
        <p>contenido</p>
      </WizardShell>
    );
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '33');
  });

  it('calls onBack when the back button is clicked', async () => {
    const onBack = vi.fn();
    render(
      <WizardShell step={1} totalSteps={6} onBack={onBack}>
        <p>contenido</p>
      </WizardShell>
    );
    await userEvent.click(screen.getByRole('button', { name: 'Atrás' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders the children content', () => {
    render(
      <WizardShell step={1} totalSteps={6} onBack={() => {}}>
        <p>Paso de prueba</p>
      </WizardShell>
    );
    expect(screen.getByText('Paso de prueba')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/WizardShell.test.tsx`
Expected: FAIL — `Cannot find module './WizardShell'`

- [ ] **Step 3: Implement src/components/WizardShell.tsx**

```tsx
import type { ReactNode } from 'react';

interface WizardShellProps {
  step: number;
  totalSteps: number;
  onBack: () => void;
  children: ReactNode;
}

export function WizardShell({ step, totalSteps, onBack, children }: WizardShellProps) {
  const progressPercent = Math.round((step / totalSteps) * 100);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="p-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Atrás"
          className="text-2xl text-purple-700 mb-3"
        >
          ←
        </button>
        <div
          className="w-full h-3 bg-gray-200 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-4">{children}</div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/WizardShell.test.tsx`
Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
git add src/components/WizardShell.tsx src/components/WizardShell.test.tsx
git commit -m "Add WizardShell component with progress bar and back button"
```

---

## Task 2: NameStep component

**Files:**
- Create: `src/components/NameStep.tsx`
- Test: `src/components/NameStep.test.tsx`

**Interfaces:**
- Consumes: nothing from prior tasks.
- Produces: `NameStep({ value, onChange, onNext })` — used by Task 5.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/NameStep.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NameStep } from './NameStep';

describe('NameStep', () => {
  it('disables the next button when the name is empty or whitespace', () => {
    render(<NameStep value="   " onChange={() => {}} onNext={() => {}} />);
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  });

  it('enables the next button when the name has content', () => {
    render(<NameStep value="Lucía" onChange={() => {}} onNext={() => {}} />);
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeEnabled();
  });

  it('calls onChange when typing', async () => {
    const onChange = vi.fn();
    render(<NameStep value="" onChange={onChange} onNext={() => {}} />);
    await userEvent.type(screen.getByLabelText('Tu nombre'), 'L');
    expect(onChange).toHaveBeenCalledWith('L');
  });

  it('calls onNext when the button is clicked', async () => {
    const onNext = vi.fn();
    render(<NameStep value="Lucía" onChange={() => {}} onNext={onNext} />);
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/NameStep.test.tsx`
Expected: FAIL — `Cannot find module './NameStep'`

- [ ] **Step 3: Implement src/components/NameStep.tsx**

```tsx
interface NameStepProps {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
}

export function NameStep({ value, onChange, onNext }: NameStepProps) {
  const canContinue = value.trim().length > 0;

  return (
    <div className="text-center max-w-sm w-full">
      <h2 className="text-2xl font-bold text-purple-700 mb-4">
        ¿Cómo te llamas, descubridor/a?
      </h2>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Escribe tu nombre"
        aria-label="Tu nombre"
        className="w-full px-4 py-3 rounded-lg border-2 border-purple-300 focus:outline-none focus:border-purple-600 text-lg text-center"
      />
      <button
        type="button"
        disabled={!canContinue}
        onClick={onNext}
        className="mt-6 w-full px-6 py-3 rounded-full text-white font-bold text-lg bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        Siguiente
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/NameStep.test.tsx`
Expected: `4 passed`

- [ ] **Step 5: Commit**

```bash
git add src/components/NameStep.tsx src/components/NameStep.test.tsx
git commit -m "Add NameStep component for the wizard's first screen"
```

---

## Task 3: Landing component

**Files:**
- Create: `src/components/Landing.tsx`
- Test: `src/components/Landing.test.tsx`

**Interfaces:**
- Consumes: nothing from prior tasks. References the static asset path `/landing-logo.png` (produced by Task 4 — the component renders correctly in tests and in the browser before that file exists too, since it's just an `<img src>` attribute, not a build-time import).
- Produces: `Landing({ onStart })` — used by Task 5.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/Landing.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Landing } from './Landing';

describe('Landing', () => {
  it('shows the title, subtitle and start button', () => {
    render(<Landing onStart={() => {}} />);
    expect(screen.getByText('Dino Discovery Generator')).toBeInTheDocument();
    expect(screen.getByText('¡Crea tu propio dinosaurio único!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '¡Empezar!' })).toBeInTheDocument();
  });

  it('calls onStart when the button is clicked', async () => {
    const onStart = vi.fn();
    render(<Landing onStart={onStart} />);
    await userEvent.click(screen.getByRole('button', { name: '¡Empezar!' }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/Landing.test.tsx`
Expected: FAIL — `Cannot find module './Landing'`

- [ ] **Step 3: Implement src/components/Landing.tsx**

```tsx
interface LandingProps {
  onStart: () => void;
}

export function Landing({ onStart }: LandingProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
      <img
        src="/landing-logo.png"
        alt="Dino Discovery Generator"
        className="w-64 h-64 object-contain mb-4"
      />
      <h1 className="text-3xl font-bold text-purple-700">Dino Discovery Generator</h1>
      <p className="mt-2 text-lg text-gray-700">¡Crea tu propio dinosaurio único!</p>
      <button
        type="button"
        onClick={onStart}
        className="mt-8 w-full max-w-xs px-6 py-4 rounded-full text-white font-bold text-xl bg-green-600 hover:bg-green-700"
      >
        ¡Empezar!
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/Landing.test.tsx`
Expected: `2 passed`

- [ ] **Step 5: Commit**

```bash
git add src/components/Landing.tsx src/components/Landing.test.tsx
git commit -m "Add Landing component"
```

---

## Task 4: Generate the landing logo image

**Files:**
- Create: `scripts/generate-landing-logo.mjs`
- Create: `public/landing-logo.png` (generated by running the script, not written by hand)

**Interfaces:**
- Consumes: `OPENAI_API_KEY` from the environment (read from `.dev.vars` when running locally).
- Produces: `public/landing-logo.png`, a static asset Vite serves at `/landing-logo.png` — consumed by `Landing.tsx` (Task 3, already references this path).

- [ ] **Step 1: Write scripts/generate-landing-logo.mjs**

```js
import { writeFile, mkdir } from 'node:fs/promises';

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('Missing OPENAI_API_KEY environment variable');
  process.exit(1);
}

const prompt =
  "A friendly cartoon dinosaur mascot logo for a children's app, smiling, " +
  'rounded soft shapes, saturated colors (green, purple, orange), simple flat ' +
  "illustration style like a children's storybook, centered, no text, no " +
  'watermark, white background.';

const response = await fetch('https://api.openai.com/v1/images/generations', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    authorization: `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    model: 'gpt-image-2',
    prompt,
    n: 1,
    size: '1024x1024',
    quality: 'low',
  }),
});

if (!response.ok) {
  const text = await response.text();
  console.error(`OpenAI API error: ${response.status} ${text}`);
  process.exit(1);
}

const data = await response.json();
const base64Image = data.data?.[0]?.b64_json;
if (!base64Image) {
  console.error('No image data in OpenAI response');
  process.exit(1);
}

await mkdir('public', { recursive: true });
await writeFile('public/landing-logo.png', Buffer.from(base64Image, 'base64'));
console.log('Wrote public/landing-logo.png');
```

- [ ] **Step 2: Run the script to generate the image**

Run:
```bash
OPENAI_API_KEY=$(grep '^OPENAI_API_KEY=' .dev.vars | cut -d= -f2-) node scripts/generate-landing-logo.mjs
```
Expected: `Wrote public/landing-logo.png` printed, and the file exists.

- [ ] **Step 3: Verify the generated file is a valid PNG**

Run: `file public/landing-logo.png`
Expected: output contains `PNG image data, 1024 x 1024`

- [ ] **Step 4: Commit**

```bash
git add scripts/generate-landing-logo.mjs public/landing-logo.png
git commit -m "Generate landing page logo image with gpt-image-2"
```

---

## Task 5: Wire the wizard into App.tsx and remove the old single-page selection

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Delete: `src/components/DiscovererForm.tsx`
- Delete: `src/components/DiscoverButton.tsx`

**Interfaces:**
- Consumes: `WizardShell` (Task 1), `NameStep` (Task 2), `Landing` (Task 3), `AttributeGroup` (unchanged, existing), `isSelectionComplete`/`NullablePartialAttributes` (existing `src/validation.ts`), `generateDino`/`RateLimitError`/`DinoApiError` (existing `src/api.ts`), `DinoAttributes` (existing `shared/types.ts`).
- Produces: the final user-facing flow — no further tasks consume this.

`DiscovererForm` and `DiscoverButton` have no dedicated test files (only the old `App.test.tsx` exercised them), so deleting them alongside the `App.test.tsx` rewrite leaves no orphaned tests.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/App.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

vi.mock('./api', () => ({
  generateDino: vi.fn(),
  RateLimitError: class RateLimitError extends Error {},
  DinoApiError: class DinoApiError extends Error {},
}));

import { generateDino } from './api';

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('App wizard flow', () => {
  beforeEach(() => {
    vi.mocked(generateDino).mockReset();
  });

  it('shows the landing page first, then the name step after clicking ¡Empezar!', async () => {
    render(<App />);
    expect(screen.getByText('Dino Discovery Generator')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '¡Empezar!' }));
    expect(screen.getByLabelText('Tu nombre')).toBeInTheDocument();
  });

  it(
    'walks through all 6 wizard steps and triggers generation on the last selection',
    async () => {
      vi.mocked(generateDino).mockResolvedValue({
        scientificName: 'Volcanius ferox',
        commonName: 'Volcanrex',
        description: 'Un dinosaurio feroz que vive en volcanes.',
        imageUrl: '/images/abc.png',
      });

      render(<App />);
      await userEvent.click(screen.getByRole('button', { name: '¡Empezar!' }));

      await userEvent.type(screen.getByLabelText('Tu nombre'), 'Lucía');
      await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

      await userEvent.click(screen.getByRole('button', { name: 'Gigante' }));
      await wait(550);
      await userEvent.click(screen.getByRole('button', { name: 'Volcán' }));
      await wait(550);
      await userEvent.click(screen.getByRole('button', { name: 'Carnívoro' }));
      await wait(550);
      await userEvent.click(screen.getByRole('button', { name: 'Cuernos' }));
      await wait(550);
      await userEvent.click(screen.getByRole('button', { name: 'Feroz' }));
      await wait(550);

      expect(generateDino).toHaveBeenCalledWith({
        size: 'Gigante',
        habitat: 'Volcán',
        diet: 'Carnívoro',
        feature: 'Cuernos',
        personality: 'Feroz',
        discovererName: 'Lucía',
      });
      expect(await screen.findByText('Volcanrex')).toBeInTheDocument();
    },
    10000
  );

  it('lets the user go back a step without losing the previously entered name', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: '¡Empezar!' }));
    await userEvent.type(screen.getByLabelText('Tu nombre'), 'Lucía');
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

    expect(screen.getByRole('button', { name: 'Gigante' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Atrás' }));

    expect(screen.getByDisplayValue('Lucía')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL — landing text/button not found (App.tsx still renders the old single-page flow)

- [ ] **Step 3: Delete the now-unused components**

```bash
rm src/components/DiscovererForm.tsx src/components/DiscoverButton.tsx
```

- [ ] **Step 4: Replace src/App.tsx**

```tsx
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
  DinoAttributes,
  GenerateDinoResponse,
} from '../shared/types';

type FlowState = 'landing' | 'wizard' | 'loading' | 'result' | 'error';

const TOTAL_WIZARD_STEPS = 6;
const AUTO_ADVANCE_DELAY_MS = 500;

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

  const certificateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    captureAdminKeyFromUrl();
  }, []);

  async function handleDiscover(attrs: DinoAttributes, name: string) {
    setFlowState('loading');
    try {
      const response = await generateDino({ ...attrs, discovererName: name });
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

  function handleSizeSelect(value: Size) {
    setSize(value);
    setTimeout(() => setWizardStep((step) => step + 1), AUTO_ADVANCE_DELAY_MS);
  }

  function handleHabitatSelect(value: Habitat) {
    setHabitat(value);
    setTimeout(() => setWizardStep((step) => step + 1), AUTO_ADVANCE_DELAY_MS);
  }

  function handleDietSelect(value: Diet) {
    setDiet(value);
    setTimeout(() => setWizardStep((step) => step + 1), AUTO_ADVANCE_DELAY_MS);
  }

  function handleFeatureSelect(value: Feature) {
    setFeature(value);
    setTimeout(() => setWizardStep((step) => step + 1), AUTO_ADVANCE_DELAY_MS);
  }

  function handlePersonalitySelect(value: Personality) {
    setPersonality(value);
    const attempted = { size, habitat, diet, feature, personality: value };
    if (!isSelectionComplete(attempted, discovererName)) return;
    setTimeout(() => {
      void handleDiscover(attempted, discovererName);
    }, AUTO_ADVANCE_DELAY_MS);
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
    <main className="min-h-screen bg-gradient-to-b from-green-100 to-blue-100">
      {flowState === 'landing' && <Landing onStart={() => setFlowState('wizard')} />}

      {flowState === 'wizard' && wizardStep === 0 && (
        <WizardShell step={1} totalSteps={TOTAL_WIZARD_STEPS} onBack={() => setFlowState('landing')}>
          <NameStep
            value={discovererName}
            onChange={setDiscovererName}
            onNext={() => setWizardStep(1)}
          />
        </WizardShell>
      )}

      {flowState === 'wizard' && wizardStep === 1 && (
        <WizardShell step={2} totalSteps={TOTAL_WIZARD_STEPS} onBack={() => setWizardStep(0)}>
          <AttributeGroup label="Tamaño" options={SIZES} selected={size} onSelect={handleSizeSelect} />
        </WizardShell>
      )}

      {flowState === 'wizard' && wizardStep === 2 && (
        <WizardShell step={3} totalSteps={TOTAL_WIZARD_STEPS} onBack={() => setWizardStep(1)}>
          <AttributeGroup
            label="Hábitat"
            options={HABITATS}
            selected={habitat}
            onSelect={handleHabitatSelect}
          />
        </WizardShell>
      )}

      {flowState === 'wizard' && wizardStep === 3 && (
        <WizardShell step={4} totalSteps={TOTAL_WIZARD_STEPS} onBack={() => setWizardStep(2)}>
          <AttributeGroup label="Dieta" options={DIETS} selected={diet} onSelect={handleDietSelect} />
        </WizardShell>
      )}

      {flowState === 'wizard' && wizardStep === 4 && (
        <WizardShell step={5} totalSteps={TOTAL_WIZARD_STEPS} onBack={() => setWizardStep(3)}>
          <AttributeGroup
            label="Característica especial"
            options={FEATURES}
            selected={feature}
            onSelect={handleFeatureSelect}
          />
        </WizardShell>
      )}

      {flowState === 'wizard' && wizardStep === 5 && (
        <WizardShell step={6} totalSteps={TOTAL_WIZARD_STEPS} onBack={() => setWizardStep(4)}>
          <AttributeGroup
            label="Personalidad"
            options={PERSONALITIES}
            selected={personality}
            onSelect={handlePersonalitySelect}
          />
        </WizardShell>
      )}

      {flowState === 'loading' && <LoadingDino />}

      {flowState === 'error' && (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
          <p className="text-red-700 font-semibold mb-4">{errorMessage}</p>
          <button
            type="button"
            onClick={() => {
              setWizardStep(0);
              setFlowState('wizard');
            }}
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/App.test.tsx`
Expected: `3 passed`

- [ ] **Step 6: Run the full suite and typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all tests pass, no type errors (the deleted `DiscovererForm.tsx`/`DiscoverButton.tsx` are not imported anywhere else)

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/App.test.tsx
git rm src/components/DiscovererForm.tsx src/components/DiscoverButton.tsx
git commit -m "Replace single-page attribute selection with landing + 6-step wizard"
```

---

## Task 6: Manual verification and deploy

**Files:** none (verification + deployment only)

- [ ] **Step 1: Build and smoke-test locally**

Run: `npm run build`
Expected: builds successfully, `public/landing-logo.png` is copied into `dist/`

- [ ] **Step 2: Manually verify the flow in the browser**

Run: `npx wrangler pages dev dist --compatibility-date=2026-06-29 --compatibility-flags=nodejs_compat`

Open the printed local URL and confirm:
- Landing page shows the logo image, title, subtitle, and "¡Empezar!" button.
- Clicking "¡Empezar!" shows the name screen with a visible progress bar at ~17%.
- Entering a name and clicking "Siguiente" advances to the Tamaño screen (progress ~33%).
- Picking an attribute auto-advances to the next screen after a brief delay, all the way through Personalidad.
- The back arrow on any attribute screen returns to the previous screen without losing earlier choices.
- Completing Personalidad shows the loading animation, then (with real API keys configured) a result screen.

- [ ] **Step 3: Deploy**

```bash
npx wrangler pages deploy dist --project-name dino-discovery-generator --branch main
```

Expected: deployment succeeds; visiting `https://dino-discovery-generator.pages.dev` shows the new landing page instead of the old single-page form.
