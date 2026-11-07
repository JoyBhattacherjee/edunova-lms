import { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { Avatar, RoleBadge, useToast, fmtDate } from '../components/ui';

export default function Profile() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [info, setInfo] = useState({ name: user.name, bio: user.bio || '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [busy, setBusy] = useState(false);

  const saveInfo = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { const d = await api.put('/auth/profile', info); setUser(d.user); toast('Profile updated'); }
    catch (err) { toast(err.message, 'error'); } finally { setBusy(false); }
  };
  const savePw = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { await api.put('/auth/profile', pw); setPw({ currentPassword: '', newPassword: '' }); toast('Password changed'); }
    catch (err) { toast(err.message, 'error'); } finally { setBusy(false); }
  };

  return (
    <>
      <div className="page-head"><div><h1>Profile & settings</h1><p>Manage your personal information and security.</p></div></div>
      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <div className="grid">
          <form className="card card-pad" onSubmit={saveInfo}>
            <div className="card-title">Personal information</div>
            <div className="field"><label>Full name</label><input className="input" value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} required /></div>
            <div className="field"><label>Email</label><input className="input" value={user.email} disabled /></div>
            <div className="field"><label>About me</label><textarea className="textarea" value={info.bio} onChange={(e) => setInfo({ ...info, bio: e.target.value })} placeholder="Tell others a little about yourself" /></div>
            <button className="btn btn-primary" disabled={busy}>Save changes</button>
          </form>
          <form className="card card-pad" onSubmit={savePw}>
            <div className="card-title">Change password</div>
            <div className="field-row">
              <div className="field"><label>Current password</label><input className="input" type="password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} required /></div>
              <div className="field"><label>New password</label><input className="input" type="password" minLength={6} value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} required /></div>
            </div>
            <button className="btn btn-soft" disabled={busy}>Update password</button>
          </form>
        </div>
        <div className="card card-pad" style={{ textAlign: 'center' }}>
          <div style={{ display: 'grid', placeItems: 'center', marginBottom: 14 }}><Avatar name={user.name} size="lg" /></div>
          <h3>{user.name}</h3>
          <div className="muted" style={{ margin: '4px 0 12px' }}>{user.email}</div>
          <RoleBadge role={user.role} />
          <p className="muted" style={{ marginTop: 16 }}>Member since {fmtDate(user.created_at)}</p>
        </div>
      </div>
    </>
  );
}
