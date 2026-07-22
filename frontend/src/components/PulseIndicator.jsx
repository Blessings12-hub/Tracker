import './PulseIndicator.css';

// The pulse is the app's signature: its speed and reach are driven by how
// recently the device actually checked in, so it doubles as real information
// (a heartbeat) rather than pure decoration.
export default function PulseIndicator({ status, lastPingAt }) {
  const ageLabel = lastPingAt ? relativeTime(lastPingAt) : 'never checked in';

  return (
    <div className={`pulse pulse--${status}`} title={ageLabel}>
      <span className="pulse__ring" />
      <span className="pulse__ring pulse__ring--delay" />
      <span className="pulse__dot" />
    </div>
  );
}

function relativeTime(iso) {
  const diffMs = Date.now() - new Date(iso + 'Z').getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
