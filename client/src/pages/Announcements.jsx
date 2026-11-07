import { useEffect, useState } from 'react';
import { Megaphone, Plus, Trash2 } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { Spinner, Empty, Modal, Avatar, useToast, fmtDate } from '../components/ui';

export default function Announcements() {
  const { user } = useAuth();
  const toast = useToast();
  const [list, setList] = useState(null);
  const [adding, setAdding] = useState(false);
  const [myCourses, setMyCourses] = useState([]);
  const [f, setF] = useState({ title: '', body: '', course_id: '' });
  const canPost = user.role !== 'student';

  const load = () => api.get('/announcements').then((d) => setList(d.announcements)).catch(() => setList([]));
  useEffect(() => {
    load();
    if (canPost) api.get('/courses/mine').then((d) => setMyCourses(d.courses)).catch(() => {});
  }, []); // eslint-disable-line

  const post = async () => {
    if (!f.title.trim()) return toast('Title is required', 'error');
    try {
      await api.post('/announcements', { ...f, course_id: f.course_id || null });
      toast('Announcement posted 📣'); setAdding(false); setF({ title: '', body: '', course_id: '' }); load();
    } catch (e) { toast(e.message, 'error'); }
  };
  const remove = async (a) => {
    if (!confirm('Delete this announcement?')) return;
    try { await api.del(`/announcements/${a.id}`); toast('Deleted'); load(); } catch (e) { toast(e.message, 'error'); }
  };

  if (!list) return <Spinner />;
  return (
    <>
      <div className="page-head">
        <div><h1>Announcements</h1><p>News and updates from your courses and the platform.</p></div>
        {canPost && <button className="btn btn-primary" onClick={() => setAdding(true)}><Plus size={17} /> New announcement</button>}
      </div>
      {list.length === 0 ? (
        <div className="card"><Empty icon={Megaphone} title="No announcements" text="You're all caught up." /></div>
      ) : (
        <div className="grid">
          {list.map((a) => (
            <div key={a.id} className="card announce">
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
                <Avatar name={a.author_name} size="sm" />
                <div className="grow">
                  <div className="title-sm">{a.author_name}</div>
                  <div className="muted">{fmtDate(a.created_at)}</div>
                </div>
                <span className={`badge ${a.course_title ? 'badge-blue' : 'badge-amber'}`}>{a.course_title || 'Everyone'}</span>
                {(user.role === 'admin' || a.author_id === user.id) && canPost && (
                  <button className="icon-btn" onClick={() => remove(a)}><Trash2 size={17} /></button>
                )}
              </div>
              <h3 style={{ fontSize: 17, marginBottom: 6 }}>{a.title}</h3>
              <p className="muted" style={{ whiteSpace: 'pre-line', fontSize: 14.5 }}>{a.body}</p>
            </div>
          ))}
        </div>
      )}
      {adding && (
        <Modal title="New announcement" onClose={() => setAdding(false)}
          footer={<><button className="btn btn-ghost" onClick={() => setAdding(false)}>Cancel</button><button className="btn btn-primary" onClick={post}>Post</button></>}>
          <div className="field">
            <label>Audience</label>
            <select className="select" value={f.course_id} onChange={(e) => setF({ ...f, course_id: e.target.value })}>
              {user.role === 'admin' && <option value="">Everyone (platform-wide)</option>}
              {user.role !== 'admin' && <option value="">Select a course…</option>}
              {myCourses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          <div className="field"><label>Title</label><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} autoFocus /></div>
          <div className="field"><label>Message</label><textarea className="textarea" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></div>
        </Modal>
      )}
    </>
  );
}
