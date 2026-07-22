import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

// Polls the device list so status/pulse stays reasonably fresh without
// needing a websocket for the MVP.
export function useDevices(pollMs = 30000) {
  const { token } = useAuth();
  const [devices, setDevices] = useState({ owned: [], shared: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(() => {
    if (!token) return;
    api
      .listDevices(token)
      .then(setDevices)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, pollMs);
    return () => clearInterval(id);
  }, [refresh, pollMs]);

  return { devices, loading, error, refresh };
}
