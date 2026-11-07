import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Mail, Lock, Sparkles, BarChart3, Award } from 'lucide-react';
import { useAuth } from '../AuthContext';

export function AuthArt() {
  return (
    <div className="auth-art">
      <div className="brand" style={{ padding: 0 }}>
        <div className="brand-mark"><GraduationCap size={22} color="#fff" /></div>
        <div>EduNova<small>LEARNING PORTAL</small></div>
      </div>
      <div>
        <h2>Learn without limits. Teach with impact.</h2>
        <p>One portal for courses, assignments, quizzes and progress tracking — built for students, instructors and administrators.</p>
        <div className="feature-list">
          <div className="feature"><Sparkles size={20} /> Interactive lessons with progress tracking</div>
          <div className="feature"><Award size={20} /> Auto-graded quizzes & instructor feedback</div>
          <div className="feature"><BarChart3 size={20} /> Insightful dashboards for every role</div>
        </div>
      </div>
      <small style={{ color: '#93c5fd' }}>© {new Date().getFullYear()} EduNova. All rights reserved.</small>
    </div>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e, creds) => {
    e?.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(creds?.email ?? email, creds?.password ?? password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const demo = [
    ['Student', 'student@edunova.com', 'Password@123'],
    ['Instructor', 'priya@edunova.com', 'Password@123'],
    ['Admin', 'admin@edunova.com', 'Admin@123'],
  ];

  return (
    <div className="auth">
      <AuthArt />
      <div className="auth-form-wrap">
        <form className="auth-form" onSubmit={submit}>
          <h1>Welcome back 👋</h1>
          <p>Sign in to continue your learning journey.</p>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="field">
            <label>Email</label>
            <div className="input-icon">
              <Mail size={17} />
              <input className="input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </div>
          </div>
          <div className="field">
            <label>Password</label>
            <div className="input-icon">
              <Lock size={17} />
              <input className="input" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
          </div>
          <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          <p style={{ textAlign: 'center', marginTop: 18, fontSize: 14 }} className="muted">
            New to EduNova? <Link to="/register" style={{ fontWeight: 700 }}>Create an account</Link>
          </p>

          <div className="demo-box">
            <h4>Try a demo account (one click)</h4>
            <div className="demo-btns">
              {demo.map(([label, e, p]) => (
                <button type="button" key={label} className="btn btn-soft btn-sm" disabled={busy} onClick={() => submit(null, { email: e, password: p })}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
