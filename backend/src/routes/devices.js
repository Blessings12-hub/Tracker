import { Router } from 'express';
import { nanoid } from 'nanoid';
import { db } from '../db.js';
import { requireAuth, requireOwner, requireViewAccess } from '../middleware/auth.js';

export const devicesRouter = Router();
devicesRouter.use(requireAuth);

const OFFLINE_MINUTES = Number(process.env.OFFLINE_THRESHOLD_MINUTES || 30);

function withStatus(device) {
  const lastPing = db
    .prepare('SELECT * FROM location_pings WHERE device_id = ? ORDER BY created_at DESC LIMIT 1')
    .get(device.id);

  let status = 'never_seen';
  if (lastPing) {
    const ageMinutes = (Date.now() - new Date(lastPing.created_at + 'Z').getTime()) / 60000;
    status = ageMinutes <= OFFLINE_MINUTES ? 'online' : 'offline';
  }

  return {
    ...device,
    last_ping: lastPing || null,
    status,
  };
}

// List every device the user owns or has accepted view access to.
devicesRouter.get('/', (req, res) => {
  const owned = db.prepare('SELECT * FROM devices WHERE owner_id = ?').all(req.user.id);
  const shared = db
    .prepare(
      `SELECT d.* FROM devices d
       JOIN device_shares s ON s.device_id = d.id
       WHERE s.shared_with_user_id = ? AND s.accepted_at IS NOT NULL`
    )
    .all(req.user.id);

  res.json({
    owned: owned.map(withStatus),
    shared: shared.map(withStatus),
  });
});

// Manual entry: register a new device you own.
devicesRouter.post('/', (req, res) => {
  const { name, platform, device_type } = req.body;
  if (!name || !platform || !device_type) {
    return res.status(400).json({ error: 'name, platform, and device_type are required' });
  }
  if (!['apple', 'android', 'web', 'other'].includes(platform)) {
    return res.status(400).json({ error: 'platform must be apple, android, web, or other' });
  }

  const id = nanoid();
  const apiKey = nanoid(32); // given to the device's PWA/agent so it can post pings
  db.prepare(
    'INSERT INTO devices (id, owner_id, name, platform, device_type, api_key) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, req.user.id, name, platform, device_type, apiKey);

  const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(id);
  res.status(201).json({ device: withStatus(device), api_key: apiKey });
});

devicesRouter.get('/:deviceId', requireViewAccess, (req, res) => {
  res.json({ device: withStatus(req.device) });
});

devicesRouter.delete('/:deviceId', requireOwner, (req, res) => {
  db.prepare('DELETE FROM devices WHERE id = ?').run(req.params.deviceId);
  res.status(204).end();
});

// Regenerate a device's API key (e.g. if it leaks). Owner only.
devicesRouter.post('/:deviceId/rotate-key', requireOwner, (req, res) => {
  const apiKey = nanoid(32);
  db.prepare('UPDATE devices SET api_key = ? WHERE id = ?').run(apiKey, req.params.deviceId);
  res.json({ api_key: apiKey });
});
