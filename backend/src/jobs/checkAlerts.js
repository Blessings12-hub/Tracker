import { nanoid } from 'nanoid';
import { db } from '../db.js';

const OFFLINE_MINUTES = Number(process.env.OFFLINE_THRESHOLD_MINUTES || 30);
const LOW_BATTERY_PCT = Number(process.env.LOW_BATTERY_THRESHOLD || 20);

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

async function insertAlert(deviceId, type, message, geofenceId = null) {
  // Avoid spamming duplicate unresolved alerts of the same type/geofence.
  const existing = await db.get(
    `SELECT id FROM alerts WHERE device_id = $1 AND type = $2 AND resolved_at IS NULL
     AND (geofence_id IS NOT DISTINCT FROM $3)`,
    [deviceId, type, geofenceId]
  );
  if (existing) return;

  await db.run(
    'INSERT INTO alerts (id, device_id, type, message, geofence_id) VALUES ($1, $2, $3, $4, $5)',
    [nanoid(), deviceId, type, message, geofenceId]
  );
}

// Run after every ping that includes coordinates.
export async function checkGeofences(deviceId, lat, lng) {
  const fences = await db.all('SELECT * FROM geofences WHERE device_id = $1', [deviceId]);
  const device = await db.get('SELECT name FROM devices WHERE id = $1', [deviceId]);

  for (const fence of fences) {
    const distance = haversineMeters(lat, lng, fence.center_lat, fence.center_lng);
    const inside = distance <= fence.radius_m;

    if (fence.alert_on === 'exit' && !inside) {
      await insertAlert(deviceId, 'geofence_exit', `${device.name} left "${fence.name}"`, fence.id);
    }
    if (fence.alert_on === 'enter' && inside) {
      await insertAlert(deviceId, 'geofence_enter', `${device.name} entered "${fence.name}"`, fence.id);
    }
  }
}

// Run on a schedule (see server.js) to catch devices that have gone quiet
// or are reporting low battery, independent of any incoming ping.
export async function sweepDevices() {
  const devices = await db.all('SELECT * FROM devices', []);

  for (const device of devices) {
    const lastPing = await db.get(
      'SELECT * FROM location_pings WHERE device_id = $1 ORDER BY created_at DESC LIMIT 1',
      [device.id]
    );

    if (lastPing) {
      const ageMinutes = (Date.now() - new Date(lastPing.created_at).getTime()) / 60000;
      if (ageMinutes > OFFLINE_MINUTES) {
        await insertAlert(device.id, 'offline', `${device.name} hasn't checked in for over ${OFFLINE_MINUTES} minutes`);
      }
      if (lastPing.battery_pct != null && lastPing.battery_pct <= LOW_BATTERY_PCT) {
        await insertAlert(device.id, 'low_battery', `${device.name} battery is at ${lastPing.battery_pct}%`);
      }
    }
  }
}
