# LoadingDino Egg-Hatch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the emoji-based `LoadingDino` stages with a 6-phase egg-hatching animation (using the approved PNGs in `public/loading/`), a simulated progress bar, and reassurance messages for slow generations, then wire it into `App.tsx` so the real API response (not a fixed timer) decides when the loading screen ends.

**Architecture:** `LoadingDino` becomes a controlled component driven by an `isDone` prop and an `onTransitionEnd` callback, instead of a fully autonomous timer-only component. It still owns its own phase/progress timers internally, but defers to the parent for when to actually leave the loading screen. `App.tsx` stops switching `flowState` to `'result'`/`'error'` the instant `generateDino()` settles; instead it flips `isDiscoveryDone` to `true` and lets `LoadingDino` call back once its ~600ms "burst" transition finishes.

**Tech Stack:** React 19 + TypeScript, Tailwind CSS (config-driven keyframes/animations), Vitest + Testing Library (fake timers for time-based behavior).

## Global Constraints

- Phases 1-4 last exactly 4000ms each (16000ms total preamble), in order: intact → wobble → crack → broken-top.
- Phase 5 (claws) holds indefinitely until `isDone` becomes `true`. Its caption is overridden by a reassurance message once total elapsed time reaches 16000ms (message 1) and 24000ms (message 2) — these thresholds are measured from component mount, not from entering phase 5.
- Progress formula: `progress% = 90 × (1 − e^(−elapsedSeconds/12))`, exposed as an exported pure function `calculateProgress(elapsedMs: number): number` so it's testable without fake timers.
- Phase 6 (burst) is shown the instant `isDone` becomes `true`, regardless of which phase was active, and `onTransitionEnd()` fires after exactly 600ms.
- Image assets already exist at `public/loading/egg-1-intact.png` through `egg-6-burst.png` — do not regenerate them.
- No backend/API changes. No new npm dependencies.

---

### Task 1: Rewrite `LoadingDino` with phases, progress, and the `isDone`/`onTransitionEnd` contract

**Files:**
- Modify: `tailwind.config.js`
- Modify: `src/components/LoadingDino.tsx` (full rewrite)
- Modify: `src/components/LoadingDino.test.tsx` (full rewrite)

**Interfaces:**
- Produces: `export function calculateProgress(elapsedMs: number): number` from `src/components/LoadingDino.tsx`.
- Produces: `export interface LoadingDinoProps { isDone: boolean; onTransitionEnd: () => void }` and `export function LoadingDino(props: LoadingDinoProps)`.
- Consumes: nothing from other tasks (this task is self-contained).

- [ ] **Step 1: Add the 6 keyframe animations to Tailwind config**

Replace the `theme.extend` object in `tailwind.config.js`:

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
      keyframes: {
        'egg-breathe': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.03)' },
        },
        'egg-wobble': {
          '0%, 100%': { transform: 'rotate(-6deg)' },
          '50%': { transform: 'rotate(6deg)' },
        },
        'egg-glow': {
          '0%, 100%': { filter: 'brightness(1)' },
          '50%': { filter: 'brightness(1.4)' },
        },
        'egg-jitter': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-3px)' },
          '75%': { transform: 'translateX(3px)' },
        },
        'egg-tug': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'egg-burst': {
          '0%': { transform: 'scale(0.7)', opacity: '0' },
          '40%': { transform: 'scale(1.3)', opacity: '1' },
          '100%': { transform: 'scale(1.1)', opacity: '1' },
        },
      },
      animation: {
        'egg-breathe': 'egg-breathe 2.4s ease-in-out infinite',
        'egg-wobble': 'egg-wobble 1.2s ease-in-out infinite',
        'egg-glow': 'egg-glow 1.4s ease-in-out infinite',
        'egg-jitter': 'egg-jitter 0.5s ease-in-out infinite',
        'egg-tug': 'egg-tug 1s ease-in-out infinite',
        'egg-burst': 'egg-burst 0.6s ease-out forwards',
      },
    },
  },
  plugins: [],
};
```

This step has no isolated test (it's Tailwind config consumed by Step 3's component). It will be exercised by Task 1's component tests checking for the `animate-egg-*` class names.

- [ ] **Step 2: Write the failing tests for `calculateProgress` and the phase/timer behavior**

Replace the entire contents of `src/components/LoadingDino.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { LoadingDino, calculateProgress } from './LoadingDino';

describe('calculateProgress', () => {
  it('starts at 0', () => {
    expect(calculateProgress(0)).toBe(0);
  });

  it('approaches 90% asymptotically but never reaches it', () => {
    expect(calculateProgress(12000)).toBeCloseTo(56.88, 1);
    expect(calculateProgress(24000)).toBeCloseTo(77.85, 1);
    expect(calculateProgress(120000)).toBeLessThan(90);
  });
});

describe('LoadingDino', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts on the intact-egg phase', () => {
    render(<LoadingDino isDone={false} onTransitionEnd={() => {}} />);
    expect(screen.getByText('Incubando el huevo...')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', '/loading/egg-1-intact.png');
  });

  it('advances through phases 2-4 every 4 seconds', () => {
    vi.useFakeTimers();
    render(<LoadingDino isDone={false} onTransitionEnd={() => {}} />);

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getByText('Algo se mueve dentro...')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', '/loading/egg-2-wobble.png');

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getByText('¡Está agrietándose!')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getByText('Está rompiendo el cascarón...')).toBeInTheDocument();
  });

  it('holds on the claws phase past 16s without isDone, then shows reassurance messages', () => {
    vi.useFakeTimers();
    render(<LoadingDino isDone={false} onTransitionEnd={() => {}} />);

    act(() => {
      vi.advanceTimersByTime(16000);
    });
    expect(screen.getByRole('img')).toHaveAttribute('src', '/loading/egg-5-claws.png');
    expect(
      screen.getByText('Tu dinosaurio es un poco tímido, está tardando un poco más...')
    ).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(8000);
    });
    expect(
      screen.getByText('¡Los mejores descubrimientos llevan su tiempo! Ya casi está...')
    ).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(20000);
    });
    expect(screen.getByRole('img')).toHaveAttribute('src', '/loading/egg-5-claws.png');
  });

  it('shows the burst phase immediately when isDone becomes true, then calls onTransitionEnd', () => {
    vi.useFakeTimers();
    const onTransitionEnd = vi.fn();
    const { rerender } = render(<LoadingDino isDone={false} onTransitionEnd={onTransitionEnd} />);

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    rerender(<LoadingDino isDone={true} onTransitionEnd={onTransitionEnd} />);

    expect(screen.getByText('¡Ha nacido tu dinosaurio!')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', '/loading/egg-6-burst.png');
    expect(onTransitionEnd).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(onTransitionEnd).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/components/LoadingDino.test.tsx`
Expected: FAIL — `calculateProgress` is not exported, `LoadingDino` doesn't accept `isDone`/`onTransitionEnd` props yet.

- [ ] **Step 4: Replace `src/components/LoadingDino.tsx` with the new implementation**

```tsx
import { useEffect, useState } from 'react';

export interface LoadingDinoProps {
  isDone: boolean;
  onTransitionEnd: () => void;
}

interface Phase {
  image: string;
  caption: string;
  animationClass: string;
}

const PHASES: Phase[] = [
  { image: '/loading/egg-1-intact.png', caption: 'Incubando el huevo...', animationClass: 'animate-egg-breathe' },
  { image: '/loading/egg-2-wobble.png', caption: 'Algo se mueve dentro...', animationClass: 'animate-egg-wobble' },
  { image: '/loading/egg-3-crack.png', caption: '¡Está agrietándose!', animationClass: 'animate-egg-glow' },
  { image: '/loading/egg-4-broken-top.png', caption: 'Está rompiendo el cascarón...', animationClass: 'animate-egg-jitter' },
  { image: '/loading/egg-5-claws.png', caption: '¡Está saliendo!', animationClass: 'animate-egg-tug' },
];

const BURST_PHASE: Phase = {
  image: '/loading/egg-6-burst.png',
  caption: '¡Ha nacido tu dinosaurio!',
  animationClass: 'animate-egg-burst',
};

const PHASE_DURATION_MS = 4000;
const HELD_PHASE_INDEX = PHASES.length - 1;
const REASSURANCE_THRESHOLD_1_MS = 16000;
const REASSURANCE_THRESHOLD_2_MS = 24000;
const BURST_DURATION_MS = 600;
const TICK_MS = 1000;

export function calculateProgress(elapsedMs: number): number {
  const elapsedSeconds = elapsedMs / 1000;
  return 90 * (1 - Math.exp(-elapsedSeconds / 12));
}

function getCaption(phaseIndex: number, elapsedMs: number): string {
  if (phaseIndex !== HELD_PHASE_INDEX) {
    return PHASES[phaseIndex].caption;
  }
  if (elapsedMs >= REASSURANCE_THRESHOLD_2_MS) {
    return '¡Los mejores descubrimientos llevan su tiempo! Ya casi está...';
  }
  if (elapsedMs >= REASSURANCE_THRESHOLD_1_MS) {
    return 'Tu dinosaurio es un poco tímido, está tardando un poco más...';
  }
  return PHASES[phaseIndex].caption;
}

export function LoadingDino({ isDone, onTransitionEnd }: LoadingDinoProps) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (isDone) return;
    const interval = setInterval(() => {
      setElapsedMs((current) => current + TICK_MS);
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [isDone]);

  useEffect(() => {
    if (!isDone) return;
    const timeout = setTimeout(onTransitionEnd, BURST_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [isDone, onTransitionEnd]);

  if (isDone) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center py-12" role="status">
        <div className={`w-28 h-28 flex items-center justify-center ${BURST_PHASE.animationClass}`}>
          <img src={BURST_PHASE.image} alt="" className="w-full h-full object-contain" />
        </div>
        <p className="mt-6 font-display text-lg text-accent uppercase tracking-wide">
          {BURST_PHASE.caption}
        </p>
      </div>
    );
  }

  const phaseIndex = Math.min(Math.floor(elapsedMs / PHASE_DURATION_MS), HELD_PHASE_INDEX);
  const phase = PHASES[phaseIndex];
  const caption = getCaption(phaseIndex, elapsedMs);
  const progress = calculateProgress(elapsedMs);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-12" role="status">
      <div className={`w-28 h-28 flex items-center justify-center ${phase.animationClass}`}>
        <img src={phase.image} alt="" className="w-full h-full object-contain" />
      </div>
      <p className="mt-6 font-display text-lg text-accent uppercase tracking-wide">{caption}</p>
      <div
        className="w-64 sm:w-80 h-2 mt-6 bg-[#1a1a1a] overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/components/LoadingDino.test.tsx`
Expected: PASS (6 tests: 2 in `calculateProgress`, 4 in `LoadingDino`).

- [ ] **Step 6: Commit**

```bash
git add tailwind.config.js src/components/LoadingDino.tsx src/components/LoadingDino.test.tsx
git commit -m "Rewrite LoadingDino with egg-hatch phases, progress bar and reassurance messages"
```

---

### Task 2: Wire `LoadingDino` into `App.tsx` and update its tests

**Files:**
- Modify: `src/App.tsx:72-89` (`handleDiscover`), `src/App.tsx:130-142` (`handleRestart`), `src/App.tsx:214` (render)
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: `LoadingDinoProps` (`isDone`, `onTransitionEnd`) from Task 1's `src/components/LoadingDino.tsx`.

- [ ] **Step 1: Write the failing test for the new transition delay**

In `src/App.test.tsx`, the existing test `'walks through all 6 wizard steps and triggers generation on the last selection'` ends with:

```tsx
expect(await screen.findByRole('heading', { name: 'Volcanrex' })).toBeInTheDocument();
```

Change it to assert the heading is *not* immediately present right after the API resolves, and only appears after the burst transition:

```tsx
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

      expect(screen.queryByRole('heading', { name: 'Volcanrex' })).not.toBeInTheDocument();
      // Querying by heading role (not findByText) because the off-screen
      // Certificate (kept mounted for html2canvas capture) also renders the
      // dino's commonName as a <p>, so a plain text query matches twice.
      expect(
        await screen.findByRole('heading', { name: 'Volcanrex' }, { timeout: 2000 })
      ).toBeInTheDocument();
```

Apply the same `timeout: 2000` bump to the final `findByRole` in the other test that ends the same way, `'does not trigger generation twice when two personality options are clicked in quick succession'` (leave the rest of that test, including its preceding `await wait(600)`, unchanged):

```tsx
      await screen.findByRole('heading', { name: 'Volcanrex' }, { timeout: 2000 });
```

- [ ] **Step 2: Run the App tests to verify they fail**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL — `LoadingDino` still flips `flowState` to `'result'` the instant `generateDino` resolves, so `screen.queryByRole('heading', { name: 'Volcanrex' })` is already present (not absent) right after the click.

- [ ] **Step 3: Update `handleDiscover` and add `isDiscoveryDone` state in `src/App.tsx`**

Add a new state declaration right after the `showEmailGate` state (around line 43):

```tsx
  const [showEmailGate, setShowEmailGate] = useState(false);
  const [isDiscoveryDone, setIsDiscoveryDone] = useState(false);
```

Replace `handleDiscover` (lines 72-89):

```tsx
  async function handleDiscover(attrs: DinoAttributes, name: string) {
    setFlowState('loading');
    setIsDiscoveryDone(false);
    try {
      const response = await generateDino({ ...attrs, discovererName: name });
      setResult(response);
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
```

- [ ] **Step 4: Reset `isDiscoveryDone` in `handleRestart`**

In `handleRestart` (lines 130-142), add the reset alongside the other state resets:

```tsx
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
  }
```

- [ ] **Step 5: Pass the new props to `LoadingDino` in the render**

Replace line 214:

```tsx
      {flowState === 'loading' && (
        <LoadingDino isDone={isDiscoveryDone} onTransitionEnd={handleLoadingTransitionEnd} />
      )}
```

- [ ] **Step 6: Run the App tests to verify they pass**

Run: `npx vitest run src/App.test.tsx`
Expected: PASS (all 7 existing tests, including the two updated in Step 1).

- [ ] **Step 7: Run the full test suite and the build**

Run: `npm test`
Expected: PASS, all test files green (no regressions in other components).

Run: `npm run build`
Expected: succeeds (typecheck + Vite build), no TypeScript errors.

- [ ] **Step 8: Commit**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "Wire LoadingDino's isDone/onTransitionEnd contract into App's discovery flow"
```
