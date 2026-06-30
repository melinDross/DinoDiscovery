type AudioContextConstructor = typeof AudioContext;

declare global {
  interface Window {
    webkitAudioContext?: AudioContextConstructor;
  }
}

// A single shared AudioContext, created lazily on first use and reused for
// every click. iOS WebKit hard-caps the number of concurrently-alive
// AudioContexts (historically ~4-6) — constructing a fresh one per call
// (the previous implementation) could silently exhaust that limit partway
// through the wizard's many taps, breaking sound for the rest of the
// session with no visible error.
let sharedContext: AudioContext | null | undefined;

function getAudioContext(): AudioContext | null {
  if (sharedContext !== undefined) return sharedContext;
  if (typeof window === 'undefined') {
    sharedContext = null;
    return sharedContext;
  }
  const Ctor = window.AudioContext ?? window.webkitAudioContext;
  sharedContext = Ctor ? new Ctor() : null;
  return sharedContext;
}

/** Synthesized UI click — avoids shipping/licensing audio assets for a tiny sound effect. */
export function playClickSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  // Browsers (notably iOS Safari) suspend a context created/resumed outside
  // a user gesture; resuming defensively here is a no-op once already
  // running, but recovers a context that got suspended after a tab switch.
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = 880;
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);

  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.08);
}
