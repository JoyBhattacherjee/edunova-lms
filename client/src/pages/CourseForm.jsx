import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api } from '../api';
import { COURSE_COLORS, Spinner, useToast, bannerStyle } from '../components/ui';

const CATEGORIES = ['Web Development', 'Data Science', 'Design', 'Cloud & DevOps', 'Marketing', 'Business', 'Mobile Development', 'General'];

export default function CourseForm() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const toast = useToast();
  const [f, setF] = useState({
    title: '', description: '', category: 'Web Development', level: 'Beginner', duration_hours: 10, status: 'published', color: '#2563eb',
  });
  const [loading, setLoading] = useState(editing);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    if (!editing) return;
    api.get(`/courses/${id}`)
      .then((d) => {
        const c = d.course;
        setF({ title: c.title, description: c.description, category: c.category, level: c.level, duration_hours: Number(c.duration_hours), status: c.status, color: c.color });
      })
      .catch((e) => toast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, [id, editing]); // eslint-disable-line

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const d = editing ? await api.put(`/courses/${id}`, f) : await api.post('/courses', f);
      toast(editing ? 'Course updated' : 'Course created 🎉');
      navigate(`/courses/${d.course.id}`);
    } catch (err) { toast(err.message, 'error'); setBusy(false); }
  };

  if (loading) return <Spinner />;

  return (
    <>
      <Link to={editing ? `/courses/${id}` : '/my-courses'} className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 14, fontWeight: 600 }}>
        <ArrowLeft size={16} /> Back
      </Link>
      <div className="page-head"><div><h1>{editing ? 'Edit course' : 'Create a new course'}</h1><p>Fill in the details — you can add lessons, assignments and quizzes afterwards.</p></div></div>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <form className="card card-pad" onSubmit={submit}>
          <div className="field"><label>Course title *</label><input className="input" value={f.title} onChange={set('title')} placeholder="e.g. Introduction to Machine Learning" required minLength={3} /></div>
          <div className="field"><label>Description</label><textarea className="textarea" value={f.description} onChange={set('description')} placeholder="What will students learn?" /></div>
          <div className="field-row">
            <div className="field"><label>Category</label>
              <input className="input" list="cats" value={f.category} onChange={set('category')} />
              <datalist id="cats">{CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
            <div className="field"><label>Level</label>
              <select className="select" value={f.level} onChange={set('level')}>{['Beginner', 'Intermediate', 'Advanced'].map((l) => <option key={l}>{l}</option>)}</select>
            </div>
          </div>
          <div className="field-row">
            <div className="field"><label>Duration (hours)</label><input className="input" type="number" min="0.5" step="0.5" value={f.duration_hours} onChange={set('duration_hours')} /></div>
            <div className="field"><label>Visibility</label>
              <select className="select" value={f.status} onChange={set('status')}><option value="published">Published</option><option value="draft">Draft (hidden)</option></select>
            </div>
          </div>
          <div className="field">
            <label>Theme color</label>
            <div className="color-dots">
              {COURSE_COLORS.map((c) => <div key={c} className={`color-dot ${f.color === c ? 'active' : ''}`} style={{ background: c }} onClick={() => setF({ ...f, color: c })} />)}
            </div>
          </div>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Create course'}</button>
        </form>

        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="course-banner" style={{ ...bannerStyle(f.color), height: 140 }}>
            <span className="badge" style={{ background: 'rgba(255,255,255,.22)', color: '#fff' }}>{f.category || 'Category'}</span>
          </div>
          <div className="course-body">
            <h3>{f.title || 'Your course title'}</h3>
            <p>{f.description || 'Your course description appears here.'}</p>
            <span className="badge badge-gray" style={{ width: 'fit-content' }}>{f.level}</span>
            <span className="hint">Live preview</span>
          </div>
        </div>
      </div>
    </>
  );
}
