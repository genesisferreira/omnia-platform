'use client';

import { useEffect, useState } from 'react';
import { Alert } from '@omnia/ui';

/** Banner leve quando o browser reporta offline. */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(typeof navigator !== 'undefined' && !navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  if (!offline) return null;
  return (
    <div className="mb-4">
      <Alert variant="warning" title="Você está offline">
        Algumas informações podem estar desatualizadas até a conexão voltar.
      </Alert>
    </div>
  );
}
