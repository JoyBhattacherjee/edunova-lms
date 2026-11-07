import { useEffect, useState } from 'react';
import { Search, Trash2, Users } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { Spinner, Empty, Avatar, RoleBadge, useToast, fmtDate } from '../components/ui';

export default function AdminUsers() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState(null);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('all');

  const load = () => {
    const qs = new URLSearchParams({ role });
    if (q) qs.set('q', q);
    api.get(`/admin/users?${qs}`).then((d) => setUsers(d.users)).catch(() => setUsers([]));
  };
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [q, role]); // eslint-disable-line

  const changeRole = async (u, newRole) => {
    try { await api.put(`/admin/users/${u.id}/role`, { role: newRole }); toast(`${u.name} is now ${newRole}`); load(); }
    catch (e) { toast(e.message, 'error'); }
  };
  const remove = async (u) => {
    if (!confirm(`Delete ${u.name}? Their courses, enrollments and submissions will be removed.`)) return;
    try { await api.del(`/admin/users/${u.id}`); toast('User deleted'); load(); } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <>
      <div className="page-head"><div><h1>Manage users</h1><p>View accounts, change roles, and remove users.</p></div></div>
      <div className="toolbar">
        <div className="input-icon"><Search size={17} /><input className="input" placeholder="Search by name or email…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select className="select" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="all">All roles</option><option value="student">Students</option><option value="instructor">Instructors</option><option value="admin">Admins</option>
        </select>
      </div>
      {!users ? <Spinner /> : users.length === 0 ? (
        <div className="card"><Empty icon={Users} title="No users found" /></div>
      ) : (
        <div className="card table-wrap">
          <table className="table">
            <thead><tr><th>User</th><th>Role</th><th>Joined</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Avatar name={u.name} size="sm" /><div><div className="title-sm">{u.name}</div><div className="muted">{u.email}</div></div></div></td>
                  <td><RoleBadge role={u.role} /></td>
                  <td>{fmtDate(u.created_at)}</td>
                  <td>
                    <div className="row-actions">
                      {u.id !== me.id ? (
                        <>
                          <select className="select" style={{ width: 130, padding: '6px 10px' }} value={u.role} onChange={(e) => changeRole(u, e.target.value)}>
                            <option value="student">Student</option><option value="instructor">Instructor</option><option value="admin">Admin</option>
                          </select>
                          <button className="icon-btn" title="Delete user" onClick={() => remove(u)}><Trash2 size={17} /></button>
                        </>
                      ) : <span className="muted">You</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
