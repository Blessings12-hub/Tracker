import { Router } from 'express';
import { nanoid } from 'nanoid';
import { db } from '../db.js';
import { requireAuth, requireOwner, requireViewAccess } from '../middleware/auth.js';

export const geofencesRouter = Router();
geofencesRouter.use(requireAuth);

geofencesRouter.get('/devices/:deviceId/geofences', requireViewAccess, (req, res) => {
  const geofences = db.prepare('SELECT * FROM geofences WHERE device_id = ?').all(req.params.deviceId);
  res.json({ geofences });
});

geofencesRouter.post('/devices/:deviceId/geofences', requireOwner, (req, res) => {
  const { name, center_lat, center_lng, radius_m, alert_on } = req.body;
  if (!name || center_lat == null || center_lng == null || !radius_m) {
    return res.status(400).json({ error: 'name, center_lat, center_lng, and radius_m are required' });
  }
  const id = nanoid();
  db.prepare(
    `INSERT INTO geofences (id, device_id, name, center_lat, center_lng, radius_m, alert_on)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, req.params.deviceId, name, center_lat, center_lng, radius_m, alert_on || 'exit');
  res.status(201).json({ geofence: db.prepare('SELECT * FROM geofences WHERE id = ?').get(id) });
});

geofencesRouter.delete('/geofences/:geofenceId', requireAuth, (req, res) => {
  const fence = db.prepare('SELECT * FROM geofences WHERE id = ?').get(req.params.geofenceId);
  if (!fence) return res.status(404).json({ error: 'Geofence not found' });
  const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(fence.device_id);
  if (device.owner_id !== req.user.id) return res.status(403).json({ error: 'Owner access required' });
  db.prepare('DELETE FROM geofences WHERE id = ?').run(req.params.geofenceId);
  res.status(204).end();
});
