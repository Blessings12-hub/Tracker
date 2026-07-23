export default function DeviceAvatar({ device, size = 40 }) {
  const style = { width: size, height: size };

  if (device.photo) {
    return <img src={device.photo} alt="" className="device-avatar" style={style} />;
  }

  const initial = (device.name || '?').trim().charAt(0).toUpperCase();
  return (
    <div className="device-avatar-fallback" style={style}>
      {initial}
    </div>
  );
}
