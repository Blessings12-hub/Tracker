import { Router } from 'express';
import { nanoid } from 'nanoid';
import { db } from '../db.js';
import { requireAuth, requireOwner } from '../middleware/auth.js';

export const sharesRouter = Router();
sharesRouter.use(requireAuth);

// Owner creates a view-only invite for a device. Returns a token the frontend
// turns into a QR code and/or a shareable link (e.g. /invite/:token).
sharesRouter.post('/devices/:deviceId/shares', requireOwner, (req, res) => {
  const { email } = req.body; // optional — link can be shared without knowing the email up front
  const id = nanoid();
  const inviteToken = nanoid(24);

  db.prepare(
    'INSERT INTO device_shares (id, device_id, invite_token, invite_email) VALUES (?, ?, ?, ?)'
  ).run(id, req.params.deviceId, inviteToken, email || null);

  res.status(201).json({ invite_token: inviteToken, invite_path: `/invite/${inviteToken}` });
});

// List shares (pending + accepted) for a device — owner only.
sharesRouter.get('/devices/:deviceId/shares', requireOwner, (req, res) => {
  const shares = db
    .prepare('SELECT id, invite_email, accepted_at, created_at FROM device_shares WHERE device_id = ?')
    .all(req.params.deviceId);
  res.json({ shares });
});

sharesRouter.delete('/shares/:shareId', requireAuth, (req, res) => {
  const share = db.prepare('SELECT * FROM device_shares WHERE id = ?').get(req.params.shareId);
  if (!share) return res.status(404).json({ error: 'Share not found' });
  const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(share.device_id);
  if (device.owner_id !== req.user.id) return res.status(403).json({ error: 'Owner access required' });
  db.prepare('DELETE FROM device_shares WHERE id = ?').run(req.params.shareId);
  res.status(204).end();
});

// The invited person (already logged in) accepts the invite by token.
sharesRouter.post('/invite/:token/accept', (req, res) => {
  const share = db.prepare('SELECT * FROM device_shares WHERE invite_token = ?').get(req.params.token);
  if (!share) return res.status(404).json({ error: 'Invite not found or already used' });

  db.prepare(
    'UPDATE device_shares SET shared_with_user_id = ?, accepted_at = datetime(\'now\'), invite_token = NULL WHERE id = ?'
  ).run(req.user.id, share.id);

  const device = db.prepare('SELECT id, name FROM devices WHERE id = ?').get(share.device_id);
  res.json({ device });
});
