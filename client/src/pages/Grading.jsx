import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { api } from '../api';
import { Spinner, Empty, Avatar, useToast, fmtDate } from '../components/ui';

export default function Grading() {
  const toast = useToast();
  const [list, setList] = useState(null);
  const [edits, setEdits] = useState({});

  const load = () => api.get('/assignments/grading-queue').then((d) => setList(d.submissions)).catch(() => setList([]));
  useEffect(() => { load(); }, []);

  const save = async (s) => {
    const e = edits[s.id] || {};
    if (e.grade === undefined || e.grade === '') return toast('Enter a grade first', 'error');
    try {
      await api.put(`/submissions/${s.id}/grade`, { grade: e.grade, feedback: e.feedback || '' });
      toast('Grade saved ✅');
      load();
    } catch (err) { toast(err.message, 'error'); }
  };

  if (!list) return <Spinner />;
  return (
    <>
      <div className="page-head"><div><h1>Grading queue</h1><p>{list.length} submission{list.length !== 1 && 's'} waiting for your review.</p></div></div>
      {list.length === 0 ? (
        <div className="card"><Empty icon={CheckCircle2} title="All caught up!" text="There are no ungraded submissions." /></div>
      ) : (
        <div className="grid">
          {list.map((s) => (
            <div key={s.id} className="card card-pad">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <Avatar name={s.student_name} />
                <div className="grow">
                  <div className="title-sm">{s.student_name}</div>
                  <div className="muted">{s.assignment_title} · {s.course_title}</div>
                </div>
                <span className="muted">{fmtDate(s.submitted_at)}</span>
              </div>
              <p style={{ whiteSpace: 'pre-line', background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid var(--border)', marginBottom: 14 }}>{s.content}</p>
              <div className="field-row" style={{ gridTemplateColumns: '140px 1fr auto', alignItems: 'end' }}>
                <div className="field" style={{ margin: 0 }}>
                  <label>Grade / {s.max_points}</label>
                  <input className="input" type="number" min="0" max={s.max_points} onChange={(e) => setEdits({ ...edits, [s.id]: { ...edits[s.id], grade: e.target.value } })} />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label>Feedback</label>
                  <input className="input" placeholder="Optional comments" onChange={(e) => setEdits({ ...edits, [s.id]: { ...edits[s.id], feedback: e.target.value } })} />
                </div>
                <button className="btn btn-primary" onClick={() => save(s)}>Save grade</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
