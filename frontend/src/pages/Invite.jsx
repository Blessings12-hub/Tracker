import { useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

export default function Invite() {
  const { token: inviteToken } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  if (!user) {
    // Send them to log in first, then bounce back here to finish accepting.
    return <Navigate to="/login" replace state={{ returnTo: `/invite/${inviteToken}` }} />;
  }

  async function accept() {
    setStatus('accepting');
    try {
      const res = await api.acceptInvite(token, inviteToken);
      setStatus('done');
      setTimeout(() => navigate(`/devices/${res.device.id}`), 800);
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  return (
    <div style={{ minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}>
        <h1 style={{ fontSize: 20, marginBottom: 10 }}>Device invite</h1>
        {status === 'idle' && (
          <>
            <p style={{ color: 'var(--slate)', fontSize: 14 }}>
              Accept this invite to get view-only access to a shared device.
            </p>
            <button className="btn" onClick={accept} style={{ width: '100%', marginTop: 10 }}>
              Accept invite
            </button>
          </>
        )}
        {status === 'accepting' && <p style={{ color: 'var(--slate)' }}>Accepting…</p>}
        {status === 'done' && <p style={{ color: 'var(--signal-teal)' }}>Access granted. Redirecting…</p>}
        {status === 'error' && <p style={{ color: 'var(--danger-coral)' }}>{error}</p>}
      </div>
    </div>
  );
}
