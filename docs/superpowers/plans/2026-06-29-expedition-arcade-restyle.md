# Expedition Arcade Visual Restyle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle every screen of the Dino Discovery app to the "Expedition Arcade" visual theme (dark forest green background, lime neon accent, Bangers + Space Grotesk type, sharp 3-4px corners) without changing any logic, state, routing, API behavior, or test-relevant component structure.

**Architecture:** Tailwind-only restyle. Extend `tailwind.config.js` with semantic color/font/radius tokens, add two small global CSS utility classes (`grid-overlay`, `corner-brackets`) for effects Tailwind utilities can't express, then rewrite each component's `className` strings in place. No new component files, no prop signature changes, no new dependencies beyond two Google Fonts `<link>` tags.

**Tech Stack:** React 18 + TypeScript, Tailwind CSS 3, Vitest + React Testing Library.

## Global Constraints

- Background: `#0d1a0f`. Background accents: `#1a3d1a` / `#0f2a0f`. Grid overlay: repeating lines `rgba(178,255,0,0.04)`, 40px grid.
- Primary accent: `#b2ff00`. Text primary: `#f5e6c8`. Text secondary: `#7a9e7a`. Text muted: `#5a7a5a`. Border default `rgba(178,255,0,0.2)`, active/hover `#b2ff00`.
- Display font: `Bangers` (letter-spacing 4-6px, uppercase). Body font: `Space Grotesk`. Both imported from Google Fonts.
- Border radius capped at 3-4px everywhere — no pill/circular shapes.
- Corner-bracket accents (`::before`/`::after` L-shapes in `#b2ff00`) used on image/cert cards instead of full borders.
- No changes to `App.tsx` state machine, `api.ts`, `validation.ts`, `emailStore.ts`, `certificate.ts`, `adminAuth.ts`, `functions/**`, or `data/attributes.ts` values.
- No new option-description copy (decided during brainstorming — emoji + label only on option cards).
- Title text changes from "Dino Discovery Generator" to two-line "Dino" / "Discovery" (decided during brainstorming) — the two tests asserting the old string must be updated to match.
- Every button must keep its existing accessible name (tests query buttons by exact name) — when visual content changes the text node content (e.g. emoji added inside a button), add `aria-label` to pin the name back to the original option string.

---

### Task 1: Global design tokens and base styles

**Files:**
- Modify: `index.html`
- Modify: `tailwind.config.js`
- Modify: `src/index.css`

**Interfaces:**
- Produces: Tailwind color tokens `bg`, `surface1`, `surface2`, `accent`, `cream`, `sage`, `moss`; font tokens `font-display`, `font-body`; capped `borderRadius` scale; CSS utility classes `.grid-overlay` and `.corner-brackets` — all consumed by every later task.

- [ ] **Step 1: Add Google Fonts to `index.html`**

Replace the `<head>` contents:

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Dino Discovery Generator</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Bangers&family=Space+Grotesk:wght@400;500;700&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Extend `tailwind.config.js` with design tokens**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0d1a0f',
        surface1: '#1a3d1a',
        surface2: '#0f2a0f',
        accent: '#b2ff00',
        cream: '#f5e6c8',
        sage: '#7a9e7a',
        moss: '#5a7a5a',
      },
      fontFamily: {
        display: ['Bangers', 'cursive'],
        body: ['"Space Grotesk"', 'sans-serif'],
      },
      borderRadius: {
        none: '0px',
        sm: '3px',
        DEFAULT: '3px',
        md: '4px',
        lg: '4px',
        xl: '4px',
        '2xl': '4px',
        '3xl': '4px',
        full: '4px',
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 3: Add global utility classes to `src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer utilities {
  .grid-overlay {
    background-color: #0d1a0f;
    background-image:
      radial-gradient(circle at 20% 20%, rgba(26, 61, 26, 0.6), transparent 50%),
      radial-gradient(circle at 80% 80%, rgba(15, 42, 15, 0.6), transparent 50%),
      repeating-linear-gradient(
        0deg,
        rgba(178, 255, 0, 0.04) 0px,
        rgba(178, 255, 0, 0.04) 1px,
        transparent 1px,
        transparent 40px
      ),
      repeating-linear-gradient(
        90deg,
        rgba(178, 255, 0, 0.04) 0px,
        rgba(178, 255, 0, 0.04) 1px,
        transparent 1px,
        transparent 40px
      );
  }

  .corner-brackets {
    position: relative;
  }

  .corner-brackets::before,
  .corner-brackets::after {
    content: '';
    position: absolute;
    width: 20px;
    height: 20px;
    pointer-events: none;
  }

  .corner-brackets::before {
    top: -2px;
    left: -2px;
    border-top: 2px solid #b2ff00;
    border-left: 2px solid #b2ff00;
  }

  .corner-brackets::after {
    bottom: -2px;
    right: -2px;
    border-bottom: 2px solid #b2ff00;
    border-right: 2px solid #b2ff00;
  }
}
```

- [ ] **Step 4: Verify nothing broke**

Run: `npm test`
Expected: all existing tests still PASS (no component markup changed yet — this is a pure config/CSS addition).

Run: `npm run build`
Expected: build succeeds (confirms `tailwind.config.js` is valid and Tailwind picks up the new tokens).

- [ ] **Step 5: Commit**

```bash
git add index.html tailwind.config.js src/index.css
git commit -m "Add Expedition Arcade design tokens and global CSS utilities"
```

---

### Task 2: Restyle Landing screen (with title copy change)

**Files:**
- Modify: `src/components/Landing.tsx`
- Modify: `src/components/Landing.test.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: `font-display`, `font-body`, `bg`, `accent`, `cream`, `sage` tokens from Task 1.
- No prop or exported signature changes (`LandingProps` unchanged).

- [ ] **Step 1: Update the failing test expectations**

In `src/components/Landing.test.tsx`, replace the title assertion:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Landing } from './Landing';

describe('Landing', () => {
  it('shows the title, subtitle and start button', () => {
    render(<Landing onStart={() => {}} />);
    expect(screen.getByText('Dino')).toBeInTheDocument();
    expect(screen.getByText('Discovery')).toBeInTheDocument();
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

In `src/App.test.tsx`, update line 25 (the landing-page assertion in the first test):

```tsx
  it('shows the landing page first, then the name step after clicking ¡Empezar!', async () => {
    render(<App />);
    expect(screen.getByText('Dino')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '¡Empezar!' }));
    expect(screen.getByLabelText('Tu nombre')).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- Landing.test.tsx App.test.tsx`
Expected: FAIL — `getByText('Dino')` finds nothing yet because `Landing.tsx` still renders the old single-line title.

- [ ] **Step 3: Restyle `Landing.tsx`**

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
      <span className="px-3 py-1 mb-6 border border-accent text-accent text-xs uppercase tracking-[3px]">
        Laboratorio de paleontología
      </span>
      <h1 className="font-display text-5xl leading-tight tracking-[5px] uppercase">
        <span className="block text-cream">Dino</span>
        <span className="block text-accent [text-shadow:0_0_40px_rgba(178,255,0,0.4)]">
          Discovery
        </span>
      </h1>
      <p className="mt-4 text-sm uppercase tracking-[2px] text-sage">
        ¡Crea tu propio dinosaurio único!
      </p>
      <button
        type="button"
        onClick={onStart}
        className="mt-8 w-full max-w-xs px-6 py-4 text-bg font-display text-xl uppercase tracking-[2px] bg-accent hover:shadow-[6px_6px_0_0_#f5e6c8] transition-shadow"
      >
        ¡Empezar!
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- Landing.test.tsx App.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/Landing.tsx src/components/Landing.test.tsx src/App.test.tsx
git commit -m "Restyle Landing screen to Expedition Arcade theme"
```

---

### Task 3: Restyle WizardShell (progress bar + back button)

**Files:**
- Modify: `src/components/WizardShell.tsx`

**Interfaces:**
- No prop changes (`WizardShellProps` unchanged). `role="progressbar"` and `aria-valuenow`/`aria-label="Atrás"` semantics unchanged — existing `WizardShell.test.tsx` must pass unmodified.

- [ ] **Step 1: Restyle the component**

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
          className="text-2xl text-accent hover:text-cream mb-3"
        >
          ←
        </button>
        <div
          className="w-full h-[2px] bg-[#1a1a1a] overflow-hidden"
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full bg-accent transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-4">{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Run tests to verify the existing suite still passes**

Run: `npm test -- WizardShell.test.tsx`
Expected: PASS (no behavior changed, only classNames)

- [ ] **Step 3: Commit**

```bash
git add src/components/WizardShell.tsx
git commit -m "Restyle WizardShell progress bar to Expedition Arcade theme"
```

---

### Task 4: Restyle NameStep

**Files:**
- Modify: `src/components/NameStep.tsx`

**Interfaces:**
- No prop changes (`NameStepProps` unchanged). `aria-label="Tu nombre"` and button name `"Siguiente"` unchanged — existing `NameStep.test.tsx` must pass unmodified.

- [ ] **Step 1: Restyle the component**

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
      <h2 className="font-display text-2xl text-cream mb-4 uppercase tracking-wide">
        ¿Cómo te llamas, descubridor/a?
      </h2>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Escribe tu nombre"
        aria-label="Tu nombre"
        className="w-full px-4 py-3 bg-bg border-2 border-accent/20 focus:outline-none focus:border-accent text-lg text-center text-cream placeholder:text-moss"
      />
      <button
        type="button"
        disabled={!canContinue}
        onClick={onNext}
        className="mt-6 w-full px-6 py-3 text-bg font-display text-lg uppercase tracking-wide bg-accent hover:shadow-[6px_6px_0_0_#f5e6c8] transition-shadow disabled:bg-[#3a3a3a] disabled:text-moss disabled:shadow-none disabled:cursor-not-allowed"
      >
        Siguiente
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Run tests to verify the existing suite still passes**

Run: `npm test -- NameStep.test.tsx`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/NameStep.tsx
git commit -m "Restyle NameStep to Expedition Arcade theme"
```

---

### Task 5: Restyle AttributeGroup with emoji option cards

**Files:**
- Modify: `src/components/AttributeGroup.tsx`

**Interfaces:**
- No prop changes (`AttributeGroupProps<T>` unchanged: `label`, `options`, `selected`, `onSelect`).
- Each option button keeps `aria-pressed={selected === option}` and `onClick={() => onSelect(option)}`. New: `aria-label={option}` is added so the accessible name stays exactly the option string even though the button now also contains a decorative emoji — this is required because `AttributeGroup.test.tsx` and `App.test.tsx` query buttons via `getByRole('button', { name: '<option>' })`.

- [ ] **Step 1: Restyle the component and add the emoji lookup**

```tsx
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
```

- [ ] **Step 2: Run tests to verify the existing suite still passes**

Run: `npm test -- AttributeGroup.test.tsx`
Expected: PASS — `getByRole('button', { name: 'Gigante' })` etc. still resolve via the `aria-label` override.

- [ ] **Step 3: Run the full App test suite to confirm wizard-step button queries still work**

Run: `npm test -- App.test.tsx`
Expected: PASS — `getByRole('button', { name: 'Mediano' })`, `'Volcán'`, `'Carnívoro'`, `'Cuernos'`, `'Feroz'`, `'Amigable'` all still resolve.

- [ ] **Step 4: Commit**

```bash
git add src/components/AttributeGroup.tsx
git commit -m "Restyle AttributeGroup with emoji option cards"
```

---

### Task 6: Restyle LoadingDino

**Files:**
- Modify: `src/components/LoadingDino.tsx`

**Interfaces:**
- No changes to `STAGES`, `STAGE_DURATION_MS`, or the stage-advance `useEffect` logic — only `className` changes. `role="status"` and the stage messages/text content stay identical — existing `LoadingDino.test.tsx` must pass unmodified.

- [ ] **Step 1: Restyle the component**

```tsx
import { useEffect, useState } from 'react';

const STAGES = [
  { emoji: '🥚', message: 'Calentando el huevo...' },
  { emoji: '🥚', message: 'Algo se mueve dentro...' },
  { emoji: '🐣', message: 'Está a punto de salir...' },
  { emoji: '🦖', message: '¡Ya casi está aquí!' },
];

const STAGE_DURATION_MS = 1500;

export function LoadingDino() {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStageIndex((current) => Math.min(current + 1, STAGES.length - 1));
    }, STAGE_DURATION_MS);
    return () => clearInterval(interval);
  }, []);

  const stage = STAGES[stageIndex];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-12" role="status">
      <div className="w-28 h-28 flex items-center justify-center border-2 border-accent/30 [box-shadow:0_0_30px_rgba(178,255,0,0.25)]">
        <div className="text-6xl animate-bounce">{stage.emoji}</div>
      </div>
      <p className="mt-6 font-display text-lg text-accent uppercase tracking-wide">{stage.message}</p>
    </div>
  );
}
```

- [ ] **Step 2: Run tests to verify the existing suite still passes**

Run: `npm test -- LoadingDino.test.tsx`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/LoadingDino.tsx
git commit -m "Restyle LoadingDino to Expedition Arcade theme"
```

---

### Task 7: Restyle ResultScreen with corner-bracket image card

**Files:**
- Modify: `src/components/ResultScreen.tsx`

**Interfaces:**
- No prop changes (`ResultScreenProps` unchanged). The common name must stay rendered as an `<h2>` element — `App.test.tsx` queries it via `getByRole('heading', { name: 'Volcanrex' })` to disambiguate from the off-screen `Certificate`'s plain `<p>` with the same text.

- [ ] **Step 1: Restyle the component**

```tsx
import type { GenerateDinoResponse } from '../../shared/types';

interface ResultScreenProps {
  result: GenerateDinoResponse;
  onDownloadClick: () => void;
}

export function ResultScreen({ result, onDownloadClick }: ResultScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-xl w-full text-center">
        <div className="relative w-64 h-64 mx-auto corner-brackets">
          <img
            src={result.imageUrl}
            alt={result.commonName}
            className="w-full h-full object-contain bg-surface2"
          />
        </div>
        <h2 className="mt-6 font-display text-3xl text-cream uppercase tracking-wide">
          {result.commonName}
        </h2>
        <p className="italic text-moss">{result.scientificName}</p>
        <p className="mt-3 text-sage">{result.description}</p>
        <button
          type="button"
          onClick={onDownloadClick}
          className="mt-6 px-6 py-3 text-bg font-display uppercase tracking-wide bg-accent hover:shadow-[6px_6px_0_0_#f5e6c8] transition-shadow"
        >
          Descargar certificado
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run tests to verify the existing suite still passes**

Run: `npm test -- ResultScreen.test.tsx`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/ResultScreen.tsx
git commit -m "Restyle ResultScreen with corner-bracket image card"
```

---

### Task 8: Restyle EmailGateModal

**Files:**
- Modify: `src/components/EmailGateModal.tsx`

**Interfaces:**
- No prop changes (`EmailGateModalProps` unchanged). Label text `"Email"`, error text `"Por favor, escribe un correo válido."`, and button names `"Cancelar"`/`"Confirmar"` stay identical — existing `EmailGateModal.test.tsx` must pass unmodified.

- [ ] **Step 1: Restyle the component**

```tsx
import { useState } from 'react';
import { isValidEmail } from '../emailStore';

interface EmailGateModalProps {
  onConfirm: (email: string) => void;
  onCancel: () => void;
}

export function EmailGateModal({ onConfirm, onCancel }: EmailGateModalProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  function handleConfirm() {
    if (!isValidEmail(email)) {
      setError('Por favor, escribe un correo válido.');
      return;
    }
    setError('');
    onConfirm(email);
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-bg border border-accent p-6 max-w-sm w-full">
        <h3 className="font-display text-xl text-cream mb-2 uppercase tracking-wide">¡Casi listo!</h3>
        <p className="text-sage mb-4">
          Escribe tu email para descargar el certificado de descubrimiento.
        </p>
        <label htmlFor="gate-email" className="block font-semibold mb-1 text-cream">
          Email
        </label>
        <input
          id="gate-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 bg-surface2 border border-accent/20 text-cream focus:outline-none focus:border-accent"
        />
        {error && <p className="text-red-400 mt-1 text-sm">{error}</p>}
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-moss text-sage font-semibold"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 bg-accent text-bg font-display uppercase tracking-wide"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run tests to verify the existing suite still passes**

Run: `npm test -- EmailGateModal.test.tsx`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/EmailGateModal.tsx
git commit -m "Restyle EmailGateModal to Expedition Arcade theme"
```

---

### Task 9: Restyle Certificate (PNG export card)

**Files:**
- Modify: `src/components/Certificate.tsx`

**Interfaces:**
- No prop changes (`CertificateProps` unchanged, `forwardRef<HTMLDivElement, CertificateProps>` signature unchanged, `Certificate.displayName` unchanged). All visible text content (`discovererName`, `result.commonName`, `result.scientificName`, `result.description`, formatted `discoveryDate`) stays identical — existing `Certificate.test.tsx` must pass unmodified. Because this component is captured off-screen as a standalone PNG via `html2canvas`/`captureCertificateAsPng`, it must carry its own opaque background rather than relying on the page's `.grid-overlay`.

- [ ] **Step 1: Restyle the component**

```tsx
import { forwardRef } from 'react';
import type { GenerateDinoResponse } from '../../shared/types';

interface CertificateProps {
  discovererName: string;
  result: GenerateDinoResponse;
}

export const Certificate = forwardRef<HTMLDivElement, CertificateProps>(
  ({ discovererName, result }, ref) => {
    const discoveryDate = new Date().toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return (
      <div
        ref={ref}
        className="relative w-[800px] p-10 bg-bg border border-accent/20 text-center corner-brackets"
      >
        <div className="text-5xl mb-2">🏆</div>
        <h2 className="font-display text-3xl text-accent uppercase tracking-wide">
          Certificado Oficial de Descubrimiento
        </h2>
        <p className="mt-4 text-xl text-cream">
          Descubridor/a Oficial: <strong>{discovererName}</strong>
        </p>
        <img
          src={result.imageUrl}
          alt={result.commonName}
          className="w-48 h-48 object-contain mx-auto my-4"
        />
        <p className="font-display text-2xl text-cream uppercase tracking-wide">{result.commonName}</p>
        <p className="italic text-moss">{result.scientificName}</p>
        <p className="mt-4 text-sage">{result.description}</p>
        <p className="mt-4 text-sage">Fecha de descubrimiento: {discoveryDate}</p>
      </div>
    );
  }
);
Certificate.displayName = 'Certificate';
```

- [ ] **Step 2: Run tests to verify the existing suite still passes**

Run: `npm test -- Certificate.test.tsx`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/Certificate.tsx
git commit -m "Restyle Certificate PNG export card to Expedition Arcade theme"
```

---

### Task 10: Restyle App root container and error state

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- No state/handler changes — only the root `<main>` className and the inline error-state JSX block's classNames. `errorMessage` text content and the `"Volver a intentar"` button name stay identical.

- [ ] **Step 1: Update the root container className**

In `src/App.tsx`, change the opening `<main>` tag:

```tsx
  return (
    <main className="min-h-screen grid-overlay text-cream font-body">
```

(replacing the previous `className="min-h-screen bg-gradient-to-b from-green-100 to-blue-100"`)

- [ ] **Step 2: Restyle the error-state block**

Replace the `flowState === 'error'` block:

```tsx
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
```

- [ ] **Step 3: Run the full App test suite**

Run: `npm test -- App.test.tsx`
Expected: PASS (all 6 existing scenarios, including the title check updated in Task 2)

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "Apply Expedition Arcade background and error-state styling to App root"
```

---

### Task 11: Full verification pass

**Files:** none (verification only)

**Interfaces:** none

- [ ] **Step 1: Run the full automated test suite**

Run: `npm test`
Expected: PASS — every test file (`App.test.tsx`, `Landing.test.tsx`, `WizardShell.test.tsx`, `NameStep.test.tsx`, `AttributeGroup.test.tsx`, `LoadingDino.test.tsx`, `ResultScreen.test.tsx`, `EmailGateModal.test.tsx`, `Certificate.test.tsx`, plus the non-UI suites) is green.

- [ ] **Step 2: Typecheck and build**

Run: `npm run typecheck`
Expected: no errors

Run: `npm run build`
Expected: build succeeds

- [ ] **Step 3: Manual browser walkthrough**

Run: `npm run dev`, open the app in a browser, and confirm:
- Landing shows the badge, two-line "Dino"/"Discovery" title with glow, subtitle, and lime CTA with hover shadow offset
- Each wizard step shows the lime progress bar, Bangers question, and emoji option cards with correct selected-state glow
- Going back/forward preserves the entered name (existing behavior, just on the new visual chrome)
- Loading screen shows the bordered emoji stage indicator advancing through all 4 stages
- Result screen shows the corner-bracketed image, Bangers common name, italic muted scientific name, and lime download button
- Email gate modal shows dark overlay, lime-bordered modal, and validates emails as before
- Downloaded certificate PNG (open the saved file) shows the dark/lime restyled certificate with correct name/date/dino info

- [ ] **Step 4: Commit (only if manual walkthrough surfaced fixes)**

If the manual walkthrough required any small fixes, commit them now with a descriptive message. If no fixes were needed, this task ends at Step 3 with no commit.
