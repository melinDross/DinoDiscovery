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
