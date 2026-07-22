import { useState } from 'react';

export default function GeofenceEditor({ geofences, currentLocation, onCreate, onDelete }) {
  const [form, setForm] = useState({ name: '', radius_m: 200, alert_on: 'exit' });

  function handleCreate(e) {
    e.preventDefault();
    if (!currentLocation) return;
    onCreate({
      name: form.name,
      center_lat: currentLocation.lat,
      center_lng: currentLocation.lng,
      radius_m: Number(form.radius_m),
      alert_on: form.alert_on,
    });
    setForm({ name: '', radius_m: 200, alert_on: 'exit' });
  }

  return (
    <div>
      {geofences.map((g) => (
        <div key={g.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: 14 }}>{g.name}</strong>
            <div className="mono" style={{ fontSize: 12, color: 'var(--slate)' }}>
              {g.radius_m}m · alert on {g.alert_on}
            </div>
          </div>
          <button className="btn secondary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => onDelete(g.id)}>
            Remove
          </button>
        </div>
      ))}

      <form onSubmit={handleCreate} className="card" style={{ marginTop: 8 }}>
        <p style={{ fontSize: 13, color: 'var(--slate)', marginTop: 0 }}>
          {currentLocation
            ? 'New zone centers on the device\'s last known location.'
            : 'Waiting for a location before a zone can be created.'}
        </p>
        <div className="field">
          <label>Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Home"
            required
          />
        </div>
        <div className="field">
          <label>Radius (meters)</label>
          <input
            type="number"
            min="10"
            value={form.radius_m}
            onChange={(e) => setForm({ ...form, radius_m: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Alert when device</label>
          <select value={form.alert_on} onChange={(e) => setForm({ ...form, alert_on: e.target.value })}>
            <option value="exit">Leaves this zone</option>
            <option value="enter">Enters this zone</option>
          </select>
        </div>
        <button className="btn" type="submit" disabled={!currentLocation}>
          Add zone
        </button>
      </form>
    </div>
  );
}
