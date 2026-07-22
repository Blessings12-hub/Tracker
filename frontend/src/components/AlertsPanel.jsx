const TYPE_LABEL = {
  offline: 'Offline',
  low_battery: 'Low battery',
  geofence_exit: 'Left zone',
  geofence_enter: 'Entered zone',
};

const TYPE_COLOR = {
  offline: 'var(--danger-coral)',
  low_battery: 'var(--alert-amber)',
  geofence_exit: 'var(--alert-amber)',
  geofence_enter: 'var(--signal-teal)',
};

export default function AlertsPanel({ alerts, onResolve }) {
  if (!alerts.length) {
    return (
      <div className="card" style={{ color: 'var(--slate)', fontSize: 14 }}>
        No active alerts. Everything's checked in.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="card"
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14 }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: TYPE_COLOR[alert.type],
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14 }}>{alert.message}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--slate)', marginTop: 2 }}>
              {TYPE_LABEL[alert.type]} · {alert.device_name}
            </div>
          </div>
          {onResolve && (
            <button className="btn secondary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => onResolve(alert.id)}>
              Dismiss
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
