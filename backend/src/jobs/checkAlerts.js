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

function insertAlert(deviceId, type, message, geofenceId = null) {
  // Avoid spamming duplicate unresolved alerts of the same type/geofence.
  const existing = db
    .prepare(
      `SELECT id FROM alerts WHERE device_id = ? AND type = ? AND resolved_at IS NULL
       AND (geofence_id IS ? OR geofence_id = ?)`
    )
    .get(deviceId, type, geofenceId, geofenceId);
  if (existing) return;

  db.prepare(
    'INSERT INTO alerts (id, device_id, type, message, geofence_id) VALUES (?, ?, ?, ?, ?)'
  ).run(nanoid(), deviceId, type, message, geofenceId);
}

// Run after every ping that includes coordinates.
export function checkGeofences(deviceId, lat, lng) {
  const fences = db.prepare('SELECT * FROM geofences WHERE device_id = ?').all(deviceId);
  const device = db.prepare('SELECT name FROM devices WHERE id = ?').get(deviceId);

  for (const fence of fences) {
    const distance = haversineMeters(lat, lng, fence.center_lat, fence.center_lng);
    const inside = distance <= fence.radius_m;

    if (fence.alert_on === 'exit' && !inside) {
      insertAlert(
        deviceId,
        'geofence_exit',
        `${device.name} left "${fence.name}"`,
        fence.id
      );
    }
    if (fence.alert_on === 'enter' && inside) {
      insertAlert(
        deviceId,
        'geofence_enter',
        `${device.name} entered "${fence.name}"`,
        fence.id
      );
    }
  }
}

// Run on a schedule (see server.js) to catch devices that have gone quiet
// or are reporting low battery, independent of any incoming ping.
export function sweepDevices() {
  const devices = db.prepare('SELECT * FROM devices').all();

  for (const device of devices) {
    const lastPing = db
      .prepare('SELECT * FROM location_pings WHERE device_id = ? ORDER BY created_at DESC LIMIT 1')
      .get(device.id);

    if (lastPing) {
      const ageMinutes = (Date.now() - new Date(lastPing.created_at + 'Z').getTime()) / 60000;
      if (ageMinutes > OFFLINE_MINUTES) {
        insertAlert(device.id, 'offline', `${device.name} hasn't checked in for over ${OFFLINE_MINUTES} minutes`);
      }
      if (lastPing.battery_pct != null && lastPing.battery_pct <= LOW_BATTERY_PCT) {
        insertAlert(device.id, 'low_battery', `${device.name} battery is at ${lastPing.battery_pct}%`);
      }
    }
  }
}
