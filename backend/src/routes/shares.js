import { Router } from 'express';
import { nanoid } from 'nanoid';
import { db } from '../db.js';
import { requireAuth, requireOwner } from '../middleware/auth.js';

export const sharesRouter = Router();
sharesRouter.use(requireAuth);

// Owner creates a view-only invite for a device. Returns a token the frontend
// turns into a QR code and/or a shareable link (e.g. /invite/:token).
sharesRouter.post('/devices/:deviceId/shares', requireOwner, async (req, res) => {
  const { email } = req.body;
  const id = nanoid();
  const inviteToken = nanoid(24);

  await db.run(
    'INSERT INTO device_shares (id, device_id, invite_token, invite_email) VALUES ($1, $2, $3, $4)',
    [id, req.params.deviceId, inviteToken, email || null]
  );

  res.status(201).json({ invite_token: inviteToken, invite_path: `/invite/${inviteToken}` });
});

// List shares (pending + accepted) for a device — owner only.
sharesRouter.get('/devices/:deviceId/shares', requireOwner, async (req, res) => {
  const shares = await db.all(
    'SELECT id, invite_email, accepted_at, created_at FROM device_shares WHERE device_id = $1',
    [req.params.deviceId]
  );
  res.json({ shares });
});

sharesRouter.delete('/shares/:shareId', requireAuth, async (req, res) => {
  const share = await db.get('SELECT * FROM device_shares WHERE id = $1', [req.params.shareId]);
  if (!share) return res.status(404).json({ error: 'Share not found' });
  const device = await db.get('SELECT * FROM devices WHERE id = $1', [share.device_id]);
  if (device.owner_id !== req.user.id) return res.status(403).json({ error: 'Owner access required' });
  await db.run('DELETE FROM device_shares WHERE id = $1', [req.params.shareId]);
  res.status(204).end();
});

// The invited person (already logged in) accepts the invite by token.
sharesRouter.post('/invite/:token/accept', async (req, res) => {
  const share = await db.get('SELECT * FROM device_shares WHERE invite_token = $1', [req.params.token]);
  if (!share) return res.status(404).json({ error: 'Invite not found or already used' });

  await db.run(
    "UPDATE device_shares SET shared_with_user_id = $1, accepted_at = now(), invite_token = NULL WHERE id = $2",
    [req.user.id, share.id]
  );

  const device = await db.get('SELECT id, name FROM devices WHERE id = $1', [share.device_id]);
  res.json({ device });
});
