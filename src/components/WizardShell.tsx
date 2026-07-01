import type { ReactNode } from 'react';
import { playClickSound } from '../sound';

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
          onClick={() => {
            playClickSound();
            onBack();
          }}
          aria-label="Atrás"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-2xl text-brand hover:text-brand-light mb-3"
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
          <div className="h-full bg-brand transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>
      <div className="flex-1 flex items-start sm:items-center justify-center p-4 pt-8 sm:pt-4">
        {children}
      </div>
    </div>
  );
}
