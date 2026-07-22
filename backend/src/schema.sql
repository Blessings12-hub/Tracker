-- Owners and shared (view-only) members
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('apple', 'android', 'web', 'other')),
  device_type TEXT NOT NULL, -- phone, laptop, earbuds, tablet, etc.
  api_key TEXT UNIQUE NOT NULL, -- used by the device agent/PWA to authenticate pings
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- View-only shares: a shared member can see a device but not edit it
CREATE TABLE IF NOT EXISTS device_shares (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  shared_with_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  invite_token TEXT UNIQUE, -- set while the invite is pending (QR / link), cleared once accepted
  invite_email TEXT,
  accepted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS location_pings (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  lat REAL,
  lng REAL,
  accuracy_m REAL,
  battery_pct INTEGER,
  source TEXT NOT NULL DEFAULT 'gps', -- gps, wifi, ip, manual
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pings_device_time ON location_pings(device_id, created_at DESC);

CREATE TABLE IF NOT EXISTS geofences (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  center_lat REAL NOT NULL,
  center_lng REAL NOT NULL,
  radius_m REAL NOT NULL,
  alert_on TEXT NOT NULL DEFAULT 'exit' CHECK (alert_on IN ('exit', 'enter')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('offline', 'low_battery', 'geofence_exit', 'geofence_enter')),
  message TEXT NOT NULL,
  geofence_id TEXT REFERENCES geofences(id) ON DELETE SET NULL,
  resolved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_alerts_device ON alerts(device_id, created_at DESC);
