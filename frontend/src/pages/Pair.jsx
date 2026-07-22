import { useEffect, useState } from 'react';
import { startCheckins } from '../agent/checkin.js';

// Open this page on the device you want to track (installed as a PWA on
// phones for background check-ins) and paste in the api_key shown when the
// device was added on the dashboard.
export default function Pair() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('tracker_device_key') || '');
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!active || !apiKey) return;
    const stop = startCheckins(apiKey);
    return stop;
  }, [active, apiKey]);

  function handleStart(e) {
    e.preventDefault();
    localStorage.setItem('tracker_device_key', apiKey);
    setActive(true);
  }

  return (
    <div style={{ minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="card" style={{ width: 360 }}>
        <h1 style={{ fontSize: 20, marginBottom: 10 }}>Pair this device</h1>
        {active ? (
          <p style={{ color: 'var(--signal-teal)', fontSize: 14 }}>
            Checking in every 5 minutes. Keep this app installed and open/backgrounded for it to keep reporting.
          </p>
        ) : (
          <form onSubmit={handleStart}>
            <p style={{ color: 'var(--slate)', fontSize: 14, marginTop: 0 }}>
              Paste the device key shown when this device was added on the dashboard.
            </p>
            <div className="field">
              <label>Device key</label>
              <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} required />
            </div>
            <button className="btn" type="submit" style={{ width: '100%' }}>
              Start check-ins
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
