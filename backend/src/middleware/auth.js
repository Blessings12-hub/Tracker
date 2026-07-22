import jwt from 'jsonwebtoken';
import { db } from '../db.js';

// Requires a valid user JWT (owner or shared member). Attaches req.user.
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await db.get('SELECT id, email, name FROM users WHERE id = $1', [payload.sub]);
    if (!user) return res.status(401).json({ error: 'Invalid token' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Requires the current user to own the device in req.params.deviceId.
export async function requireOwner(req, res, next) {
  const device = await db.get('SELECT * FROM devices WHERE id = $1', [req.params.deviceId]);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  if (device.owner_id !== req.user.id) return res.status(403).json({ error: 'Owner access required' });
  req.device = device;
  next();
}

// Requires the current user to own OR have accepted view access to the device.
export async function requireViewAccess(req, res, next) {
  const device = await db.get('SELECT * FROM devices WHERE id = $1', [req.params.deviceId]);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  if (device.owner_id === req.user.id) {
    req.device = device;
    return next();
  }
  const share = await db.get(
    'SELECT * FROM device_shares WHERE device_id = $1 AND shared_with_user_id = $2 AND accepted_at IS NOT NULL',
    [req.params.deviceId, req.user.id]
  );
  if (!share) return res.status(403).json({ error: 'No access to this device' });
  req.device = device;
  next();
}

// Authenticates a device agent/PWA using its own api_key (separate from user login).
export async function requireDeviceKey(req, res, next) {
  const key = req.headers['x-device-key'];
  if (!key) return res.status(401).json({ error: 'Missing device key' });
  const device = await db.get('SELECT * FROM devices WHERE api_key = $1', [key]);
  if (!device) return res.status(401).json({ error: 'Invalid device key' });
  req.device = device;
  next();
}
