const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  signup: (body) => request('/auth/signup', { method: 'POST', body }),
  login: (body) => request('/auth/login', { method: 'POST', body }),
  me: (token) => request('/auth/me', { token }),

  listDevices: (token) => request('/devices', { token }),
  createDevice: (token, body) => request('/devices', { method: 'POST', body, token }),
  getDevice: (token, id) => request(`/devices/${id}`, { token }),
  deleteDevice: (token, id) => request(`/devices/${id}`, { method: 'DELETE', token }),
  rotateKey: (token, id) => request(`/devices/${id}/rotate-key`, { method: 'POST', token }),
  setDevicePhoto: (token, id, photo) =>
    request(`/devices/${id}/photo`, { method: 'POST', body: { photo }, token }),

  getPings: (token, id, limit = 200) => request(`/devices/${id}/pings?limit=${limit}`, { token }),

  createInvite: (token, deviceId, email) =>
    request(`/devices/${deviceId}/shares`, { method: 'POST', body: { email }, token }),
  listShares: (token, deviceId) => request(`/devices/${deviceId}/shares`, { token }),
  revokeShare: (token, shareId) => request(`/shares/${shareId}`, { method: 'DELETE', token }),
  acceptInvite: (token, inviteToken) =>
    request(`/invite/${inviteToken}/accept`, { method: 'POST', token }),

  listGeofences: (token, deviceId) => request(`/devices/${deviceId}/geofences`, { token }),
  createGeofence: (token, deviceId, body) =>
    request(`/devices/${deviceId}/geofences`, { method: 'POST', body, token }),
  deleteGeofence: (token, id) => request(`/geofences/${id}`, { method: 'DELETE', token }),

  listAlerts: (token) => request('/alerts', { token }),
  listDeviceAlerts: (token, deviceId) => request(`/devices/${deviceId}/alerts`, { token }),
  resolveAlert: (token, alertId) => request(`/alerts/${alertId}/resolve`, { method: 'POST', token }),
};
