import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { startCheckins } from '../agent/checkin.js';

// Open this page on the device you want to track (installed as a PWA on
// phones for background check-ins). Scanning the QR code shown after adding
// a device lands here with the key already filled in — pasting it in by
// hand still works too, as a fallback.
export default function Pair() {
  const [searchParams] = useSearchParams();
  const [apiKey, setApiKey] = useState(
    () => searchParams.get('key') || localStorage.getItem('tracker_device_key') || ''
  );
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

  const cameFromScan = Boolean(searchParams.get('key'));

  return (
    <div style={{ minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="card" style={{ width: '100%', maxWidth: 360 }}>
        <h1 style={{ fontSize: 20, marginBottom: 10 }}>Pair this device</h1>
        {active ? (
          <p style={{ color: 'var(--signal-teal)', fontSize: 14 }}>
            Checking in every 5 minutes. Keep this app installed and open/backgrounded for it to keep reporting.
          </p>
        ) : (
          <form onSubmit={handleStart}>
            <p style={{ color: 'var(--slate)', fontSize: 14, marginTop: 0 }}>
              {cameFromScan
                ? 'Device key filled in from the QR code. Confirm to start check-ins from this device.'
                : 'Paste the device key shown when this device was added on the dashboard.'}
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
