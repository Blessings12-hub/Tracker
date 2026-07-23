import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';
import { fileToResizedDataUri } from '../utils/image.js';
import MapView from '../components/MapView.jsx';
import PulseIndicator from '../components/PulseIndicator.jsx';
import GeofenceEditor from '../components/GeofenceEditor.jsx';
import DeviceAvatar from '../components/DeviceAvatar.jsx';

export default function DeviceDetail() {
  const { deviceId } = useParams();
  const { token, user } = useAuth();
  const [device, setDevice] = useState(null);
  const [pings, setPings] = useState([]);
  const [geofences, setGeofences] = useState([]);
  const [shares, setShares] = useState([]);
  const [invite, setInvite] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  const isOwner = device && user && device.owner_id === user.id;

  function load() {
    api.getDevice(token, deviceId).then((d) => setDevice(d.device));
    api.getPings(token, deviceId).then((d) => setPings(d.pings));
    api.listGeofences(token, deviceId).then((d) => setGeofences(d.geofences));
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  useEffect(() => {
    if (isOwner) api.listShares(token, deviceId).then((d) => setShares(d.shares));
  }, [isOwner, token, deviceId]);

  async function handleCreateInvite() {
    const res = await api.createInvite(token, deviceId);
    setInvite(res.invite_path);
  }

  async function handleCreateGeofence(body) {
    await api.createGeofence(token, deviceId, body);
    api.listGeofences(token, deviceId).then((d) => setGeofences(d.geofences));
  }

  async function handleDeleteGeofence(id) {
    await api.deleteGeofence(token, id);
    setGeofences((g) => g.filter((x) => x.id !== id));
  }

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const dataUri = await fileToResizedDataUri(file);
      await api.setDevicePhoto(token, deviceId, dataUri);
      setDevice((d) => ({ ...d, photo: dataUri }));
    } catch (err) {
      alert(err.message);
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleRemovePhoto() {
    await api.setDevicePhoto(token, deviceId, null);
    setDevice((d) => ({ ...d, photo: null }));
  }

  if (!device) return <div className="page">Loading…</div>;

  const currentLocation = device.last_ping?.lat != null
    ? { lat: device.last_ping.lat, lng: device.last_ping.lng }
    : null;

  return (
    <div className="page">
      <Link to="/" style={{ color: 'var(--slate)', fontSize: 13 }}>
        ← Back to dashboard
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '14px 0 22px', flexWrap: 'wrap' }}>
        <DeviceAvatar device={device} size={44} />
        <h1 style={{ fontSize: 22, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{device.name}</h1>
        <PulseIndicator status={device.status} lastPingAt={device.last_ping?.created_at} />
        <span className={`badge ${device.status}`}>{device.status.replace('_', ' ')}</span>
      </div>

      <div className="split-grid wide-detail">
        <div>
          <MapView devices={[device]} trail={pings} geofences={geofences} height={320} />

          <h2 style={{ fontSize: 16, margin: '24px 0 12px' }}>Zones</h2>
          {isOwner ? (
            <GeofenceEditor
              geofences={geofences}
              currentLocation={currentLocation}
              onCreate={handleCreateGeofence}
              onDelete={handleDeleteGeofence}
            />
          ) : (
            <p style={{ color: 'var(--slate)', fontSize: 14 }}>
              Only the owner can manage zones for this device.
            </p>
          )}
        </div>

        <div>
          {isOwner && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: 14, marginBottom: 10 }}>Photo</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <DeviceAvatar device={device} size={56} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    style={{ display: 'none' }}
                    id="photo-input"
                  />
                  <button
                    type="button"
                    className="btn secondary"
                    style={{ fontSize: 13 }}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                  >
                    {uploadingPhoto ? 'Uploading…' : device.photo ? 'Change photo' : 'Add photo'}
                  </button>
                  {device.photo && (
                    <button type="button" className="btn secondary" style={{ fontSize: 13 }} onClick={handleRemovePhoto}>
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="card" style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 14, marginBottom: 10 }}>Details</h2>
            <div className="mono" style={{ fontSize: 13, color: 'var(--slate)', lineHeight: 1.8 }}>
              <div>platform: {device.platform}</div>
              <div>type: {device.device_type}</div>
              {device.last_ping?.battery_pct != null && <div>battery: {device.last_ping.battery_pct}%</div>}
              {device.last_ping && <div>source: {device.last_ping.source}</div>}
            </div>
          </div>

          {isOwner && (
            <div className="card">
              <h2 style={{ fontSize: 14, marginBottom: 10 }}>Sharing (view-only)</h2>
              {shares.map((s) => (
                <div key={s.id} style={{ fontSize: 13, color: 'var(--slate)', marginBottom: 6 }}>
                  {s.accepted_at ? 'Accepted' : 'Pending'} {s.invite_email ? `· ${s.invite_email}` : ''}
                </div>
              ))}
              <button className="btn secondary" onClick={handleCreateInvite} style={{ marginTop: 8 }}>
                Create invite link
              </button>
              {invite && (
                <p className="mono" style={{ fontSize: 12, marginTop: 10, wordBreak: 'break-all', color: 'var(--signal-teal)' }}>
                  {window.location.origin}{invite}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
