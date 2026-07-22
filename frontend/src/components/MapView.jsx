import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const STATUS_COLOR = {
  online: '#3ed7c4',
  offline: '#e8615c',
  never_seen: '#8890a6',
};

function dotIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #12141c;box-shadow:0 0 0 2px ${color}55"></div>`,
    iconSize: [14, 14],
  });
}

// devices: array of { id, name, status, last_ping: { lat, lng } }
// trail: optional array of pings for a single-device detail view
// geofences: optional array for the detail view
export default function MapView({ devices = [], trail = [], geofences = [], height = 420 }) {
  const withLocation = devices.filter((d) => d.last_ping?.lat != null);
  const center = withLocation[0]?.last_ping
    ? [withLocation[0].last_ping.lat, withLocation[0].last_ping.lng]
    : [20, 0];
  const zoom = withLocation.length ? 12 : 2;

  const trailPoints = trail.filter((p) => p.lat != null).map((p) => [p.lat, p.lng]);

  return (
    <div style={{ height, borderRadius: 14, overflow: 'hidden' }}>
      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
        />

        {withLocation.map((d) => (
          <Marker
            key={d.id}
            position={[d.last_ping.lat, d.last_ping.lng]}
            icon={dotIcon(STATUS_COLOR[d.status] || STATUS_COLOR.never_seen)}
          >
            <Popup>{d.name}</Popup>
          </Marker>
        ))}

        {trailPoints.length > 1 && (
          <Polyline positions={trailPoints} pathOptions={{ color: '#3ed7c4', weight: 2, opacity: 0.6 }} />
        )}

        {geofences.map((g) => (
          <Circle
            key={g.id}
            center={[g.center_lat, g.center_lng]}
            radius={g.radius_m}
            pathOptions={{ color: '#f0a868', fillOpacity: 0.08 }}
          />
        ))}
      </MapContainer>
    </div>
  );
}
