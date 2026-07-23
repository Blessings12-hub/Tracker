import { Router } from 'express';
import { nanoid } from 'nanoid';
import { db } from '../db.js';
import { requireAuth, requireOwner, requireViewAccess } from '../middleware/auth.js';

export const devicesRouter = Router();
devicesRouter.use(requireAuth);

const OFFLINE_MINUTES = Number(process.env.OFFLINE_THRESHOLD_MINUTES || 30);

async function withStatus(device) {
  const lastPing = await db.get(
    'SELECT * FROM location_pings WHERE device_id = $1 ORDER BY created_at DESC LIMIT 1',
    [device.id]
  );

  let status = 'never_seen';
  if (lastPing) {
    const ageMinutes = (Date.now() - new Date(lastPing.created_at).getTime()) / 60000;
    status = ageMinutes <= OFFLINE_MINUTES ? 'online' : 'offline';
  }

  return { ...device, last_ping: lastPing || null, status };
}

// List every device the user owns or has accepted view access to.
devicesRouter.get('/', async (req, res) => {
  const owned = await db.all('SELECT * FROM devices WHERE owner_id = $1', [req.user.id]);
  const shared = await db.all(
    `SELECT d.* FROM devices d
     JOIN device_shares s ON s.device_id = d.id
     WHERE s.shared_with_user_id = $1 AND s.accepted_at IS NOT NULL`,
    [req.user.id]
  );

  res.json({
    owned: await Promise.all(owned.map(withStatus)),
    shared: await Promise.all(shared.map(withStatus)),
  });
});

// Manual entry: register a new device you own.
devicesRouter.post('/', async (req, res) => {
  const { name, platform, device_type } = req.body;
  if (!name || !platform || !device_type) {
    return res.status(400).json({ error: 'name, platform, and device_type are required' });
  }
  if (!['apple', 'android', 'web', 'other'].includes(platform)) {
    return res.status(400).json({ error: 'platform must be apple, android, web, or other' });
  }

  const id = nanoid();
  const apiKey = nanoid(32); // given to the device's PWA/agent so it can post pings
  await db.run(
    'INSERT INTO devices (id, owner_id, name, platform, device_type, api_key) VALUES ($1, $2, $3, $4, $5, $6)',
    [id, req.user.id, name, platform, device_type, apiKey]
  );

  const device = await db.get('SELECT * FROM devices WHERE id = $1', [id]);
  res.status(201).json({ device: await withStatus(device), api_key: apiKey });
});

devicesRouter.get('/:deviceId', requireViewAccess, async (req, res) => {
  res.json({ device: await withStatus(req.device) });
});

devicesRouter.delete('/:deviceId', requireOwner, async (req, res) => {
  await db.run('DELETE FROM devices WHERE id = $1', [req.params.deviceId]);
  res.status(204).end();
});

// Set or clear a device's photo. Owner only. Expects a small base64 data URI —
// the frontend downsizes the image before sending it, so this stays cheap to
// store as a column rather than needing separate file storage.
devicesRouter.post('/:deviceId/photo', requireOwner, async (req, res) => {
  const { photo } = req.body; // data URI string, or null to remove
  if (photo && photo.length > 350000) {
    return res.status(413).json({ error: 'Photo is too large' });
  }
  await db.run('UPDATE devices SET photo = $1 WHERE id = $2', [photo || null, req.params.deviceId]);
  res.json({ ok: true });
});

// Regenerate a device's API key (e.g. if it leaks). Owner only.
devicesRouter.post('/:deviceId/rotate-key', requireOwner, async (req, res) => {
  const apiKey = nanoid(32);
  await db.run('UPDATE devices SET api_key = $1 WHERE id = $2', [apiKey, req.params.deviceId]);
  res.json({ api_key: apiKey });
});
