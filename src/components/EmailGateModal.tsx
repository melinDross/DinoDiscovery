import { useState } from 'react';
import { isValidEmail } from '../../shared/validateEmail';

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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-bg border border-brand p-6 max-w-sm w-full my-auto max-h-[90vh] overflow-y-auto">
        <h3 className="font-display2 font-semibold text-xl text-cream mb-2 uppercase tracking-wide">¡Casi listo!</h3>
        <p className="text-sage mb-4">
          Escribe tu email para descargar la carta de descubrimiento.
        </p>
        <label htmlFor="gate-email" className="block font-semibold mb-1 text-cream">
          Email
        </label>
        <input
          id="gate-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 bg-surface2 border border-brand/20 text-cream focus:outline-none focus:border-brand"
        />
        {error && <p className="text-red-400 mt-1 text-sm">{error}</p>}
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-3 border border-moss text-sage font-semibold rounded-[999px]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 px-4 py-3 bg-brand text-white font-display2 font-semibold uppercase tracking-wide rounded-[999px]"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
