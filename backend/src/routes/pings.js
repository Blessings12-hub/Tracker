import { Router } from 'express';
import { nanoid } from 'nanoid';
import { db } from '../db.js';
import { requireDeviceKey } from '../middleware/auth.js';
import { requireAuth, requireViewAccess } from '../middleware/auth.js';
import { checkGeofences } from '../jobs/checkAlerts.js';

export const pingsRouter = Router();

// Called by the device's PWA/agent on an interval — not by the logged-in user.
// Auth is via the device's own api_key (x-device-key header), not a user JWT.
pingsRouter.post('/pings', requireDeviceKey, (req, res) => {
  const { lat, lng, accuracy_m, battery_pct, source } = req.body;
  const id = nanoid();

  db.prepare(
    `INSERT INTO location_pings (id, device_id, lat, lng, accuracy_m, battery_pct, source)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, req.device.id, lat ?? null, lng ?? null, accuracy_m ?? null, battery_pct ?? null, source || 'gps');

  if (lat != null && lng != null) {
    checkGeofences(req.device.id, lat, lng);
  }

  res.status(201).json({ ok: true });
});

// History/trail for the map — owner or accepted shared viewer.
pingsRouter.get('/devices/:deviceId/pings', requireAuth, requireViewAccess, (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 200, 1000);
  const pings = db
    .prepare('SELECT * FROM location_pings WHERE device_id = ? ORDER BY created_at DESC LIMIT ?')
    .all(req.params.deviceId, limit);
  res.json({ pings });
});
