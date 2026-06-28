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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-6 max-w-sm w-full">
        <h3 className="text-xl font-bold text-purple-700 mb-2">¡Casi listo!</h3>
        <p className="text-gray-700 mb-4">
          Escribe tu email para descargar el certificado de descubrimiento.
        </p>
        <label htmlFor="gate-email" className="block font-semibold mb-1">
          Email
        </label>
        <input
          id="gate-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border-2 border-purple-300 focus:outline-none focus:border-purple-600"
        />
        {error && <p className="text-red-600 mt-1 text-sm">{error}</p>}
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-full border-2 border-gray-300 font-semibold"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 rounded-full bg-purple-600 text-white font-semibold"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
