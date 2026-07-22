import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requireViewAccess } from '../middleware/auth.js';

export const alertsRouter = Router();
alertsRouter.use(requireAuth);

// All unresolved alerts across every device the user can see (dashboard bell icon).
alertsRouter.get('/alerts', async (req, res) => {
  const alerts = await db.all(
    `SELECT a.*, d.name AS device_name FROM alerts a
     JOIN devices d ON d.id = a.device_id
     WHERE a.resolved_at IS NULL
       AND (
         d.owner_id = $1
         OR d.id IN (
           SELECT device_id FROM device_shares
           WHERE shared_with_user_id = $1 AND accepted_at IS NOT NULL
         )
       )
     ORDER BY a.created_at DESC`,
    [req.user.id]
  );
  res.json({ alerts });
});

alertsRouter.get('/devices/:deviceId/alerts', requireViewAccess, async (req, res) => {
  const alerts = await db.all(
    'SELECT * FROM alerts WHERE device_id = $1 ORDER BY created_at DESC LIMIT 100',
    [req.params.deviceId]
  );
  res.json({ alerts });
});

alertsRouter.post('/alerts/:alertId/resolve', async (req, res) => {
  const alert = await db.get('SELECT * FROM alerts WHERE id = $1', [req.params.alertId]);
  if (!alert) return res.status(404).json({ error: 'Alert not found' });
  const device = await db.get('SELECT * FROM devices WHERE id = $1', [alert.device_id]);
  if (device.owner_id !== req.user.id) return res.status(403).json({ error: 'Owner access required' });
  await db.run("UPDATE alerts SET resolved_at = now() WHERE id = $1", [req.params.alertId]);
  res.status(204).end();
});
