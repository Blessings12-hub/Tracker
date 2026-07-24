import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext.jsx';
import { useDevices } from '../hooks/useDevices.js';
import { api } from '../api/client.js';
import DeviceCard from '../components/DeviceCard.jsx';
import MapView from '../components/MapView.jsx';
import AlertsPanel from '../components/AlertsPanel.jsx';

export default function Dashboard() {
  const { token, user, logout } = useAuth();
  const { devices, loading, refresh } = useDevices();
  const [alerts, setAlerts] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newDevice, setNewDevice] = useState({ name: '', platform: 'apple', device_type: 'phone' });
  const [createdKey, setCreatedKey] = useState(null);

  useEffect(() => {
    api.listAlerts(token).then((d) => setAlerts(d.alerts)).catch(() => {});
  }, [token, devices]);

  async function handleAddDevice(e) {
    e.preventDefault();
    const res = await api.createDevice(token, newDevice);
    setCreatedKey(res.api_key);
    refresh();
  }

  async function handleResolve(alertId) {
    await api.resolveAlert(token, alertId);
    setAlerts((a) => a.filter((x) => x.id !== alertId));
  }

  const allDevices = [...devices.owned, ...devices.shared];

  return (
    <div className="app-shell">
      <div className="app-main">
        <div className="topbar">
          <div className="topbar-brand">
            <img src="/logo.png" alt="" />
            <h1>Device Tracker</h1>
          </div>
          <div className="topbar-actions">
            <span className="user-name">{user?.name}</span>
            <button className="btn secondary" onClick={logout}>
              Sign out
            </button>
          </div>
        </div>

        <div className="page split-grid">
          <div>
            <MapView devices={allDevices} height={280} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '22px 0 12px' }}>
              <h2 style={{ fontSize: 16 }}>Devices</h2>
              <button className="btn" onClick={() => setShowAdd((s) => !s)}>
                {showAdd ? 'Cancel' : '+ Add device'}
              </button>
            </div>

            {showAdd && (
              <form onSubmit={handleAddDevice} className="card" style={{ marginBottom: 16 }}>
                {createdKey ? (
                  <div>
                    <p style={{ fontSize: 14 }}>
                      Device added. On the device you want to track, open its camera and scan this
                      code — it'll open the pairing page with the key already filled in:
                    </p>
                    <div
                      style={{
                        background: '#fff',
                        padding: 16,
                        borderRadius: 12,
                        display: 'inline-block',
                        marginBottom: 12,
                      }}
                    >
                      <QRCodeSVG
                        value={`${window.location.origin}/pair?key=${createdKey}`}
                        size={180}
                        fgColor="#12141c"
                      />
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--slate)' }}>
                      Or paste this key in manually on{' '}
                      <span className="mono" style={{ color: 'var(--paper)' }}>
                        /pair
                      </span>
                      :
                    </p>
                    <p className="mono" style={{ fontSize: 13, wordBreak: 'break-all', color: 'var(--signal-teal)' }}>
                      {createdKey}
                    </p>
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={() => {
                        setCreatedKey(null);
                        setShowAdd(false);
                      }}
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="field">
                      <label>Name</label>
                      <input
                        value={newDevice.name}
                        onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                        placeholder="e.g. My iPhone"
                        required
                      />
                    </div>
                    <div className="field">
                      <label>Platform</label>
                      <select
                        value={newDevice.platform}
                        onChange={(e) => setNewDevice({ ...newDevice, platform: e.target.value })}
                      >
                        <option value="apple">Apple</option>
                        <option value="android">Android</option>
                        <option value="web">Web</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="field">
                      <label>Type</label>
                      <select
                        value={newDevice.device_type}
                        onChange={(e) => setNewDevice({ ...newDevice, device_type: e.target.value })}
                      >
                        <option value="phone">Phone</option>
                        <option value="laptop">Laptop</option>
                        <option value="earbuds">Earbuds</option>
                        <option value="tablet">Tablet</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <button className="btn" type="submit">
                      Add device
                    </button>
                  </>
                )}
              </form>
            )}

            {!loading && allDevices.length === 0 && (
              <div className="card" style={{ color: 'var(--slate)' }}>
                No devices yet. Add one to start tracking.
              </div>
            )}

            {devices.owned.map((d) => (
              <DeviceCard key={d.id} device={d} />
            ))}
            {devices.shared.map((d) => (
              <DeviceCard key={d.id} device={d} shared />
            ))}
          </div>

          <div>
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>Alerts</h2>
            <AlertsPanel alerts={alerts} onResolve={handleResolve} />
          </div>
        </div>
      </div>
    </div>
  );
}
