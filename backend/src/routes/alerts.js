import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requireOwner, requireViewAccess } from '../middleware/auth.js';

export const alertsRouter = Router();
alertsRouter.use(requireAuth);

// All unresolved alerts across every device the user can see (dashboard bell icon).
alertsRouter.get('/alerts', (req, res) => {
  const alerts = db
    .prepare(
      `SELECT a.*, d.name AS device_name FROM alerts a
       JOIN devices d ON d.id = a.device_id
       WHERE a.resolved_at IS NULL
         AND (
           d.owner_id = ?
           OR d.id IN (
             SELECT device_id FROM device_shares
             WHERE shared_with_user_id = ? AND accepted_at IS NOT NULL
           )
         )
       ORDER BY a.created_at DESC`
    )
    .all(req.user.id, req.user.id);
  res.json({ alerts });
});

alertsRouter.get('/devices/:deviceId/alerts', requireViewAccess, (req, res) => {
  const alerts = db
    .prepare('SELECT * FROM alerts WHERE device_id = ? ORDER BY created_at DESC LIMIT 100')
    .all(req.params.deviceId);
  res.json({ alerts });
});

alertsRouter.post('/alerts/:alertId/resolve', (req, res) => {
  const alert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(req.params.alertId);
  if (!alert) return res.status(404).json({ error: 'Alert not found' });
  const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(alert.device_id);
  if (device.owner_id !== req.user.id) return res.status(403).json({ error: 'Owner access required' });
  db.prepare('UPDATE alerts SET resolved_at = datetime(\'now\') WHERE id = ?').run(req.params.alertId);
  res.status(204).end();
});
