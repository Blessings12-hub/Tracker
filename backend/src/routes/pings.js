import { Router } from 'express';
import { nanoid } from 'nanoid';
import { db } from '../db.js';
import { requireDeviceKey } from '../middleware/auth.js';
import { requireAuth, requireViewAccess } from '../middleware/auth.js';
import { checkGeofences } from '../jobs/checkAlerts.js';

export const pingsRouter = Router();

// Called by the device's PWA/agent on an interval — not by the logged-in user.
// Auth is via the device's own api_key (x-device-key header), not a user JWT.
pingsRouter.post('/pings', requireDeviceKey, async (req, res) => {
  const { lat, lng, accuracy_m, battery_pct, source } = req.body;
  const id = nanoid();

  await db.run(
    `INSERT INTO location_pings (id, device_id, lat, lng, accuracy_m, battery_pct, source)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, req.device.id, lat ?? null, lng ?? null, accuracy_m ?? null, battery_pct ?? null, source || 'gps']
  );

  if (lat != null && lng != null) {
    await checkGeofences(req.device.id, lat, lng);
  }

  res.status(201).json({ ok: true });
});

// History/trail for the map — owner or accepted shared viewer.
pingsRouter.get('/devices/:deviceId/pings', requireAuth, requireViewAccess, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 200, 1000);
  const pings = await db.all(
    'SELECT * FROM location_pings WHERE device_id = $1 ORDER BY created_at DESC LIMIT $2',
    [req.params.deviceId, limit]
  );
  res.json({ pings });
});
