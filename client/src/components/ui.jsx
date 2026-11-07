import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, X, Inbox } from 'lucide-react';

/* ---------- Toasts ---------- */
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((message, type = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setItems((l) => [...l, { id, message, type }]);
    setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), 3800);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- Small building blocks ---------- */
export const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

const AVATAR_COLORS = ['#2563eb', '#0891b2', '#7c3aed', '#0ea5e9', '#4f46e5', '#0284c7', '#1d4ed8'];
export function Avatar({ name, size = '' }) {
  const color = AVATAR_COLORS[(name || 'x').charCodeAt(0) % AVATAR_COLORS.length];
  return (
    <div className={`avatar ${size}`} style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
      {initials(name)}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="center">
      <div className="spinner" />
    </div>
  );
}

export function Empty({ icon: Icon = Inbox, title, text, action }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon size={28} />
      </div>
      <h4>{title}</h4>
      {text && <p>{text}</p>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}

export function ProgressBar({ value }) {
  return (
    <div className={`progress ${value >= 100 ? 'done' : ''}`}>
      <span style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, color = '#2563eb', bg = '#dbeafe' }) {
  return (
    <div className="card stat">
      <div className="stat-icon" style={{ background: bg, color }}>
        <Icon size={26} />
      </div>
      <div>
        <div className="stat-val">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

export function Modal({ title, onClose, children, footer, wide }) {
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function RoleBadge({ role }) {
  const cls = role === 'admin' ? 'badge-red' : role === 'instructor' ? 'badge-amber' : 'badge-blue';
  return <span className={`badge ${cls}`}>{role}</span>;
}

/* ---------- Helpers ---------- */
export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export function dueLabel(d) {
  if (!d) return { text: 'No deadline', cls: 'badge-gray' };
  const days = Math.ceil((new Date(d) - Date.now()) / 86400000);
  if (days < 0) return { text: `Overdue ${Math.abs(days)}d`, cls: 'badge-red' };
  if (days === 0) return { text: 'Due today', cls: 'badge-amber' };
  if (days <= 3) return { text: `Due in ${days}d`, cls: 'badge-amber' };
  return { text: `Due ${fmtDate(d)}`, cls: 'badge-blue' };
}

export const COURSE_COLORS = ['#2563eb', '#0891b2', '#7c3aed', '#0ea5e9', '#4f46e5', '#1d4ed8', '#0369a1', '#f59e0b'];
export const bannerStyle = (color = '#2563eb') => ({ background: `linear-gradient(135deg, ${color}, ${color}bb 60%, #1e3a8a)` });
