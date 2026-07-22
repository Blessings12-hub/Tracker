import { Link } from 'react-router-dom';
import PulseIndicator from './PulseIndicator.jsx';

const PLATFORM_LABEL = { apple: 'Apple', android: 'Android', web: 'Web', other: 'Other' };

export default function DeviceCard({ device, shared }) {
  const battery = device.last_ping?.battery_pct;

  return (
    <Link
      to={`/devices/${device.id}`}
      className="card"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        textDecoration: 'none',
        color: 'inherit',
        marginBottom: 10,
      }}
    >
      <PulseIndicator status={device.status} lastPingAt={device.last_ping?.created_at} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <strong style={{ fontFamily: 'var(--font-display)', fontSize: 15 }}>{device.name}</strong>
          {shared && (
            <span className="badge" style={{ background: 'rgba(136,144,166,0.12)', color: 'var(--slate)' }}>
              shared
            </span>
          )}
        </div>
        <div style={{ fontSize: 13, color: 'var(--slate)', marginTop: 2 }}>
          {PLATFORM_LABEL[device.platform]} · {device.device_type}
        </div>
      </div>

      {battery != null && (
        <span className="mono" style={{ fontSize: 13, color: battery <= 20 ? 'var(--alert-amber)' : 'var(--slate)' }}>
          {battery}%
        </span>
      )}

      <span className={`badge ${device.status}`}>{device.status.replace('_', ' ')}</span>
    </Link>
  );
}
