import { Router } from 'express';
import { nanoid } from 'nanoid';
import { db } from '../db.js';
import { requireAuth, requireOwner, requireViewAccess } from '../middleware/auth.js';

export const geofencesRouter = Router();

geofencesRouter.get('/devices/:deviceId/geofences', requireAuth, requireViewAccess, async (req, res) => {
  const geofences = await db.all('SELECT * FROM geofences WHERE device_id = $1', [req.params.deviceId]);
  res.json({ geofences });
});

geofencesRouter.post('/devices/:deviceId/geofences', requireAuth, requireOwner, async (req, res) => {
  const { name, center_lat, center_lng, radius_m, alert_on } = req.body;
  if (!name || center_lat == null || center_lng == null || !radius_m) {
    return res.status(400).json({ error: 'name, center_lat, center_lng, and radius_m are required' });
  }
  const id = nanoid();
  await db.run(
    `INSERT INTO geofences (id, device_id, name, center_lat, center_lng, radius_m, alert_on)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, req.params.deviceId, name, center_lat, center_lng, radius_m, alert_on || 'exit']
  );
  res.status(201).json({ geofence: await db.get('SELECT * FROM geofences WHERE id = $1', [id]) });
});

geofencesRouter.delete('/geofences/:geofenceId', requireAuth, async (req, res) => {
  const fence = await db.get('SELECT * FROM geofences WHERE id = $1', [req.params.geofenceId]);
  if (!fence) return res.status(404).json({ error: 'Geofence not found' });
  const device = await db.get('SELECT * FROM devices WHERE id = $1', [fence.device_id]);
  if (device.owner_id !== req.user.id) return res.status(403).json({ error: 'Owner access required' });
  await db.run('DELETE FROM geofences WHERE id = $1', [req.params.geofenceId]);
  res.status(204).end();
});
