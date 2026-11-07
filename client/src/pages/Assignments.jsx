import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, CheckCircle2, Award, Send } from 'lucide-react';
import { api } from '../api';
import { Spinner, Empty, Modal, useToast, dueLabel, fmtDate } from '../components/ui';

export default function Assignments() {
  const toast = useToast();
  const [list, setList] = useState(null);
  const [filter, setFilter] = useState('pending');
  const [submitFor, setSubmitFor] = useState(null);
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api.get('/assignments/mine').then((d) => setList(d.assignments)).catch(() => setList([]));
  useEffect(() => { load(); }, []);

  const openSubmit = (a) => { setSubmitFor(a); setContent(a.submission_content || ''); };
  const submit = async () => {
    setBusy(true);
    try { await api.post(`/assignments/${submitFor.id}/submit`, { content }); toast('Work submitted ✅'); setSubmitFor(null); load(); }
    catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };

  if (!list) return <Spinner />;
  const status = (a) => (a.grade !== null && a.grade !== undefined ? 'graded' : a.submission_id ? 'submitted' : 'pending');
  const shown = filter === 'all' ? list : list.filter((a) => status(a) === filter);
  const counts = { pending: 0, submitted: 0, graded: 0 };
  list.forEach((a) => counts[status(a)]++);

  return (
    <>
      <div className="page-head"><div><h1>Assignments</h1><p>Track deadlines, submit work and review feedback.</p></div></div>
      <div className="chips" style={{ marginBottom: 22 }}>
        {[['pending', `To do (${counts.pending})`], ['submitted', `Submitted (${counts.submitted})`], ['graded', `Graded (${counts.graded})`], ['all', 'All']].map(([k, l]) => (
          <button key={k} className={`chip ${filter === k ? 'active' : ''}`} onClick={() => setFilter(k)}>{l}</button>
        ))}
      </div>
      {shown.length === 0 ? (
        <div className="card"><Empty icon={CheckCircle2} title="Nothing here" text="No assignments match this filter." /></div>
      ) : (
        <div className="grid">
          {shown.map((a) => {
            const due = dueLabel(a.due_date);
            const st = status(a);
            return (
              <div key={a.id} className="card card-pad" style={{ borderLeft: `5px solid ${a.course_color}` }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div className="grow">
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: 17 }}>{a.title}</h3>
                      {st === 'pending' && <span className={`badge ${due.cls}`}>{due.text}</span>}
                      {st === 'submitted' && <span className="badge badge-blue"><CheckCircle2 size={13} /> Submitted {fmtDate(a.submitted_at)}</span>}
                      {st === 'graded' && <span className="badge badge-green"><Award size={13} /> {a.grade}/{a.max_points}</span>}
                    </div>
                    <Link to={`/courses/${a.course_id}?tab=assignments`} className="muted" style={{ fontWeight: 600 }}>{a.course_title}</Link>
                    <p className="muted" style={{ marginTop: 8, whiteSpace: 'pre-line' }}>{a.description}</p>
                    {a.feedback && <div className="alert alert-info" style={{ marginTop: 12, marginBottom: 0 }}><b>Feedback:</b> {a.feedback}</div>}
                  </div>
                  {st !== 'graded' && (
                    <button className="btn btn-primary btn-sm" onClick={() => openSubmit(a)}><Send size={15} /> {st === 'pending' ? 'Submit' : 'Edit'}</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {submitFor && (
        <Modal title={`Submit: ${submitFor.title}`} onClose={() => setSubmitFor(null)}
          footer={<><button className="btn btn-ghost" onClick={() => setSubmitFor(null)}>Cancel</button><button className="btn btn-primary" onClick={submit} disabled={busy}>Submit</button></>}>
          <div className="field">
            <label>Your answer / links</label>
            <textarea className="textarea" style={{ minHeight: 170 }} value={content} onChange={(e) => setContent(e.target.value)} autoFocus />
            <span className="hint">You can edit until it is graded.</span>
          </div>
        </Modal>
      )}
    </>
  );
}
