// This runs ON the device being tracked (after it's paired with its api_key),
// not in the owner's dashboard session. It's what turns "the web app" into
// an actual reporting agent for phones/laptops that install it as a PWA.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const INTERVAL_MS = 5 * 60 * 1000; // check in every 5 minutes while active/backgrounded

export function startCheckins(apiKey) {
  reportOnce(apiKey);
  const id = setInterval(() => reportOnce(apiKey), INTERVAL_MS);
  return () => clearInterval(id);
}

async function reportOnce(apiKey) {
  const location = await getLocation();
  const battery = await getBattery();

  try {
    await fetch(`${API_URL}/pings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-device-key': apiKey },
      body: JSON.stringify({
        lat: location?.lat ?? null,
        lng: location?.lng ?? null,
        accuracy_m: location?.accuracy ?? null,
        battery_pct: battery,
        source: location?.source ?? 'unknown',
      }),
    });
  } catch {
    // Offline — the ping is simply skipped. The dashboard will show the
    // device as "offline" once enough intervals are missed, which is the
    // correct and honest signal: no network means no report.
  }
}

function getLocation() {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          source: 'gps',
        }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  });
}

async function getBattery() {
  try {
    if ('getBattery' in navigator) {
      const battery = await navigator.getBattery();
      return Math.round(battery.level * 100);
    }
  } catch {
    // Battery Status API isn't available on every browser/platform.
  }
  return null;
}
