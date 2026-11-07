import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, GraduationCap, Presentation } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { AuthArt } from './Login';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <AuthArt />
      <div className="auth-form-wrap">
        <form className="auth-form" onSubmit={submit}>
          <h1>Create your account</h1>
          <p>Join EduNova in less than a minute.</p>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="field">
            <label>I want to…</label>
            <div className="role-pick">
              <button type="button" className={`role-opt ${form.role === 'student' ? 'active' : ''}`} onClick={() => setForm({ ...form, role: 'student' })}>
                <GraduationCap size={18} /> Learn
              </button>
              <button type="button" className={`role-opt ${form.role === 'instructor' ? 'active' : ''}`} onClick={() => setForm({ ...form, role: 'instructor' })}>
                <Presentation size={18} /> Teach
              </button>
            </div>
          </div>
          <div className="field">
            <label>Full name</label>
            <div className="input-icon"><User size={17} /><input className="input" placeholder="Jane Doe" value={form.name} onChange={set('name')} required /></div>
          </div>
          <div className="field">
            <label>Email</label>
            <div className="input-icon"><Mail size={17} /><input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required /></div>
          </div>
          <div className="field">
            <label>Password</label>
            <div className="input-icon"><Lock size={17} /><input className="input" type="password" placeholder="At least 6 characters" value={form.password} onChange={set('password')} required minLength={6} /></div>
          </div>
          <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
          <p style={{ textAlign: 'center', marginTop: 18, fontSize: 14 }} className="muted">
            Already have an account? <Link to="/login" style={{ fontWeight: 700 }}>Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
