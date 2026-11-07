import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  BookOpen, Clock, Users, CheckCircle2, Circle, Lock, PlayCircle, ChevronDown, ChevronUp, Plus, Pencil, Trash2,
  ClipboardList, HelpCircle, Layers, Award, Send, FileText, Timer,
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import {
  Spinner, Empty, Modal, ProgressBar, Avatar, useToast, fmtDate, dueLabel, bannerStyle,
} from '../components/ui';

export default function CourseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const tab = params.get('tab') || 'lessons';

  const load = useCallback(() => {
    api.get(`/courses/${id}`).then(setData).catch((e) => setError(e.message));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!data) return <Spinner />;

  const { course, lessons } = data;
  const manage = course.can_manage;
  const isStudent = user.role === 'student';
  const canSee = manage || course.is_enrolled;
  const setTab = (t) => setParams({ tab: t });

  const enroll = async () => {
    setBusy(true);
    try { await api.post(`/courses/${id}/enroll`); toast('You are enrolled — happy learning! 🎉'); load(); }
    catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  const unenroll = async () => {
    if (!confirm('Leave this course? Your lesson progress will be removed.')) return;
    try { await api.del(`/courses/${id}/enroll`); toast('You have left the course'); load(); }
    catch (e) { toast(e.message, 'error'); }
  };
  const deleteCourse = async () => {
    if (!confirm('Delete this course and all its content? This cannot be undone.')) return;
    try { await api.del(`/courses/${id}`); toast('Course deleted'); navigate('/my-courses'); }
    catch (e) { toast(e.message, 'error'); }
  };

  const tabs = [
    ['lessons', 'Lessons', BookOpen, lessons.length],
    ['assignments', 'Assignments', ClipboardList],
    ['quizzes', 'Quizzes', HelpCircle],
    ...(manage ? [['students', 'Students', Users, course.enrolled_count]] : []),
  ];

  return (
    <>
      <div className="hero" style={bannerStyle(course.color)}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className="badge" style={{ background: 'rgba(255,255,255,.22)', color: '#fff' }}>{course.category}</span>
          <span className="badge" style={{ background: 'rgba(255,255,255,.22)', color: '#fff' }}>{course.level}</span>
          {course.status === 'draft' && <span className="badge badge-amber">Draft — hidden from students</span>}
        </div>
        <h1>{course.title}</h1>
        <p>{course.description}</p>
        <div className="meta">
          <span><Avatar name={course.instructor_name} size="sm" /> {course.instructor_name}</span>
          <span><BookOpen size={15} /> {course.lessons_count} lessons</span>
          <span><Clock size={15} /> {Number(course.duration_hours)} hours</span>
          <span><Users size={15} /> {course.enrolled_count} students</span>
        </div>
        {isStudent && course.is_enrolled && (
          <div style={{ marginTop: 20, maxWidth: 420 }}>
            <div className="hbar-top" style={{ color: '#fff' }}><span>Your progress</span><span>{course.progress}%</span></div>
            <ProgressBar value={course.progress} />
          </div>
        )}
        <div className="hero-actions">
          {isStudent && !course.is_enrolled && (
            <button className="btn btn-white" onClick={enroll} disabled={busy}>Enroll for free</button>
          )}
          {isStudent && course.is_enrolled && (
            <button className="btn btn-outline-white" onClick={unenroll}>Leave course</button>
          )}
          {manage && (
            <>
              <Link to={`/courses/${id}/edit`} className="btn btn-white"><Pencil size={16} /> Edit course</Link>
              <button className="btn btn-outline-white" onClick={deleteCourse}><Trash2 size={16} /> Delete</button>
            </>
          )}
        </div>
      </div>

      {isStudent && !course.is_enrolled && (
        <div className="alert alert-info"><Lock size={14} style={{ verticalAlign: -2 }} /> Enroll to unlock lessons, assignments and quizzes.</div>
      )}

      <div className="tabs">
        {tabs.map(([key, label, Icon, count]) => (
          <button key={key} className={`tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
            <Icon size={17} /> {label} {count !== undefined && <span className="count">{count}</span>}
          </button>
        ))}
      </div>

      {tab === 'lessons' && <LessonsTab courseId={id} lessons={lessons} manage={manage} isStudent={isStudent} enrolled={course.is_enrolled} reload={load} />}
      {tab === 'assignments' && <AssignmentsTab courseId={id} manage={manage} canSee={canSee} />}
      {tab === 'quizzes' && <QuizzesTab courseId={id} manage={manage} canSee={canSee} />}
      {tab === 'students' && manage && <StudentsTab courseId={id} />}
    </>
  );
}

/* ====================== Lessons ====================== */
function LessonsTab({ courseId, lessons, manage, isStudent, enrolled, reload }) {
  const toast = useToast();
  const [open, setOpen] = useState(null);
  const [editing, setEditing] = useState(null); // null | {} (new) | lesson

  const toggleDone = async (l) => {
    try { await api.post(`/lessons/${l.id}/complete`); reload(); }
    catch (e) { toast(e.message, 'error'); }
  };
  const remove = async (l) => {
    if (!confirm(`Delete lesson "${l.title}"?`)) return;
    try { await api.del(`/lessons/${l.id}`); toast('Lesson deleted'); reload(); }
    catch (e) { toast(e.message, 'error'); }
  };

  return (
    <>
      {manage && (
        <div style={{ marginBottom: 16 }}>
          <button className="btn btn-primary" onClick={() => setEditing({})}><Plus size={17} /> Add lesson</button>
        </div>
      )}
      {lessons.length === 0 ? (
        <div className="card"><Empty icon={BookOpen} title="No lessons yet" text={manage ? 'Add your first lesson to get started.' : 'The instructor is still preparing the content.'} /></div>
      ) : (
        lessons.map((l, i) => {
          const isOpen = open === l.id;
          return (
            <div key={l.id} className={`lesson ${isOpen ? 'open' : ''} ${l.completed ? 'done' : ''}`}>
              <div className="lesson-head" onClick={() => !l.locked && setOpen(isOpen ? null : l.id)}>
                <div className="lesson-num">{l.completed ? <CheckCircle2 size={18} /> : i + 1}</div>
                <div className="grow">
                  <div className="title-sm">{l.title}</div>
                  <div className="muted"><Timer size={12} style={{ verticalAlign: -1 }} /> {l.duration_min} min</div>
                </div>
                {l.locked ? <Lock size={18} color="#94a3b8" /> : isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
              {isOpen && !l.locked && (
                <div className="lesson-body">
                  {l.video_url && (
                    <p style={{ marginBottom: 12 }}>
                      <a href={l.video_url} target="_blank" rel="noreferrer" className="btn btn-soft btn-sm"><PlayCircle size={16} /> Watch video</a>
                    </p>
                  )}
                  {l.content}
                  <div className="lesson-actions">
                    {isStudent && enrolled && (
                      <button className={`btn btn-sm ${l.completed ? 'btn-ghost' : 'btn-primary'}`} onClick={() => toggleDone(l)}>
                        {l.completed ? <><Circle size={15} /> Mark as not done</> : <><CheckCircle2 size={15} /> Mark as complete</>}
                      </button>
                    )}
                    {manage && (
                      <>
                        <button className="btn btn-soft btn-sm" onClick={() => setEditing(l)}><Pencil size={14} /> Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => remove(l)}><Trash2 size={14} /> Delete</button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
      {editing && <LessonModal courseId={courseId} lesson={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
    </>
  );
}

function LessonModal({ courseId, lesson, onClose, onSaved }) {
  const toast = useToast();
  const isNew = !lesson.id;
  const [f, setF] = useState({
    title: lesson.title || '', content: lesson.content || '', video_url: lesson.video_url || '', duration_min: lesson.duration_min || 10,
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const save = async () => {
    if (!f.title.trim()) return toast('Lesson title is required', 'error');
    setBusy(true);
    try {
      if (isNew) await api.post(`/courses/${courseId}/lessons`, f);
      else await api.put(`/lessons/${lesson.id}`, f);
      toast(isNew ? 'Lesson added' : 'Lesson updated');
      onSaved();
    } catch (e) { toast(e.message, 'error'); setBusy(false); }
  };

  return (
    <Modal title={isNew ? 'Add lesson' : 'Edit lesson'} onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save lesson'}</button></>}>
      <div className="field"><label>Title</label><input className="input" value={f.title} onChange={set('title')} autoFocus /></div>
      <div className="field"><label>Lesson content</label><textarea className="textarea" style={{ minHeight: 160 }} value={f.content} onChange={set('content')} placeholder="Explain the topic, add notes, key takeaways…" /></div>
      <div className="field-row">
        <div className="field"><label>Video link (optional)</label><input className="input" value={f.video_url} onChange={set('video_url')} placeholder="https://youtube.com/…" /></div>
        <div className="field"><label>Duration (minutes)</label><input className="input" type="number" min="1" value={f.duration_min} onChange={set('duration_min')} /></div>
      </div>
    </Modal>
  );
}

/* ====================== Assignments ====================== */
function AssignmentsTab({ courseId, manage, canSee }) {
  const toast = useToast();
  const [list, setList] = useState(null);
  const [adding, setAdding] = useState(false);
  const [submitFor, setSubmitFor] = useState(null);
  const [viewSubs, setViewSubs] = useState(null);

  const load = useCallback(() => {
    api.get(`/courses/${courseId}/assignments`).then((d) => setList(d.assignments)).catch(() => setList([]));
  }, [courseId]);
  useEffect(() => { load(); }, [load]);

  const remove = async (a) => {
    if (!confirm(`Delete assignment "${a.title}" and all submissions?`)) return;
    try { await api.del(`/assignments/${a.id}`); toast('Assignment deleted'); load(); } catch (e) { toast(e.message, 'error'); }
  };

  if (!canSee) return <div className="card"><Empty icon={Lock} title="Enroll to see assignments" /></div>;
  if (!list) return <Spinner />;

  return (
    <>
      {manage && <div style={{ marginBottom: 16 }}><button className="btn btn-primary" onClick={() => setAdding(true)}><Plus size={17} /> New assignment</button></div>}
      {list.length === 0 ? (
        <div className="card"><Empty icon={ClipboardList} title="No assignments yet" text={manage ? 'Create an assignment for your students.' : 'Nothing has been assigned yet.'} /></div>
      ) : (
        <div className="grid">
          {list.map((a) => {
            const due = dueLabel(a.due_date);
            return (
              <div key={a.id} className="card card-pad">
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div className="grow">
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: 17 }}>{a.title}</h3>
                      <span className={`badge ${due.cls}`}>{due.text}</span>
                      <span className="badge badge-gray">{a.max_points} pts</span>
                    </div>
                    <p className="muted" style={{ marginTop: 8, whiteSpace: 'pre-line' }}>{a.description}</p>
                  </div>
                  {manage ? (
                    <div className="row-actions">
                      <span className="badge badge-blue">{a.submission_count} submitted</span>
                      {a.ungraded_count > 0 && <span className="badge badge-amber">{a.ungraded_count} to grade</span>}
                      <button className="btn btn-soft btn-sm" onClick={() => setViewSubs(a)}>Submissions</button>
                      <button className="icon-btn" onClick={() => remove(a)} title="Delete"><Trash2 size={17} /></button>
                    </div>
                  ) : (
                    <div>
                      {a.grade !== null && a.grade !== undefined ? (
                        <span className="badge badge-green"><Award size={13} /> {a.grade}/{a.max_points}</span>
                      ) : a.submission_id ? (
                        <span className="badge badge-blue"><CheckCircle2 size={13} /> Submitted · awaiting grade</span>
                      ) : null}
                    </div>
                  )}
                </div>
                {!manage && a.feedback && <div className="alert alert-info" style={{ marginTop: 14, marginBottom: 0 }}><b>Feedback:</b> {a.feedback}</div>}
                {!manage && (a.grade === null || a.grade === undefined) && (
                  <button className="btn btn-primary btn-sm" style={{ marginTop: 14 }} onClick={() => setSubmitFor(a)}>
                    <Send size={15} /> {a.submission_id ? 'Edit submission' : 'Submit work'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {adding && <AssignmentModal courseId={courseId} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />}
      {submitFor && <SubmitModal assignment={submitFor} onClose={() => setSubmitFor(null)} onSaved={() => { setSubmitFor(null); load(); }} />}
      {viewSubs && <SubmissionsModal assignment={viewSubs} onClose={() => { setViewSubs(null); load(); }} />}
    </>
  );
}

function AssignmentModal({ courseId, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ title: '', description: '', due_date: '', max_points: 100 });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    if (!f.title.trim()) return toast('Title is required', 'error');
    setBusy(true);
    try {
      await api.post(`/courses/${courseId}/assignments`, { ...f, due_date: f.due_date ? new Date(f.due_date).toISOString() : null });
      toast('Assignment created'); onSaved();
    } catch (e) { toast(e.message, 'error'); setBusy(false); }
  };
  return (
    <Modal title="New assignment" onClose={onClose} footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy} onClick={save}>Create</button></>}>
      <div className="field"><label>Title</label><input className="input" value={f.title} onChange={set('title')} autoFocus /></div>
      <div className="field"><label>Instructions</label><textarea className="textarea" value={f.description} onChange={set('description')} /></div>
      <div className="field-row">
        <div className="field"><label>Due date</label><input className="input" type="date" value={f.due_date} onChange={set('due_date')} /></div>
        <div className="field"><label>Max points</label><input className="input" type="number" min="1" value={f.max_points} onChange={set('max_points')} /></div>
      </div>
    </Modal>
  );
}

function SubmitModal({ assignment, onClose, onSaved }) {
  const toast = useToast();
  const [content, setContent] = useState(assignment.submission_content || '');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try { await api.post(`/assignments/${assignment.id}/submit`, { content }); toast('Work submitted ✅'); onSaved(); }
    catch (e) { toast(e.message, 'error'); setBusy(false); }
  };
  return (
    <Modal title={`Submit: ${assignment.title}`} onClose={onClose} footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy} onClick={save}><Send size={15} /> Submit</button></>}>
      <p className="muted" style={{ marginBottom: 14, whiteSpace: 'pre-line' }}>{assignment.description}</p>
      <div className="field">
        <label>Your answer / links</label>
        <textarea className="textarea" style={{ minHeight: 170 }} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write your answer or paste a link to your work (GitHub, Drive…)" autoFocus />
        <span className="hint">You can edit your submission until it is graded.</span>
      </div>
    </Modal>
  );
}

function SubmissionsModal({ assignment, onClose }) {
  const toast = useToast();
  const [subs, setSubs] = useState(null);
  const [edits, setEdits] = useState({});

  const load = useCallback(() => {
    api.get(`/assignments/${assignment.id}/submissions`).then((d) => setSubs(d.submissions)).catch(() => setSubs([]));
  }, [assignment.id]);
  useEffect(() => { load(); }, [load]);

  const grade = async (s) => {
    const e = edits[s.id] || {};
    const g = e.grade ?? s.grade;
    if (g === undefined || g === null || g === '') return toast('Enter a grade first', 'error');
    try {
      await api.put(`/submissions/${s.id}/grade`, { grade: g, feedback: e.feedback ?? s.feedback ?? '' });
      toast('Grade saved'); load();
    } catch (err) { toast(err.message, 'error'); }
  };

  return (
    <Modal wide title={`Submissions · ${assignment.title}`} onClose={onClose}>
      {!subs ? <Spinner /> : subs.length === 0 ? <Empty icon={FileText} title="No submissions yet" /> : subs.map((s) => (
        <div key={s.id} className="q-block">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Avatar name={s.student_name} size="sm" />
            <div className="grow"><div className="title-sm">{s.student_name}</div><div className="muted">Submitted {fmtDate(s.submitted_at)}</div></div>
            {s.grade !== null ? <span className="badge badge-green">{s.grade}/{assignment.max_points}</span> : <span className="badge badge-amber">Needs grading</span>}
          </div>
          <p style={{ whiteSpace: 'pre-line', background: '#fff', padding: 12, borderRadius: 10, border: '1px solid var(--border)', marginBottom: 12 }}>{s.content}</p>
          <div className="field-row" style={{ gridTemplateColumns: '120px 1fr auto', alignItems: 'end' }}>
            <div className="field" style={{ margin: 0 }}><label>Grade / {assignment.max_points}</label>
              <input className="input" type="number" min="0" max={assignment.max_points} defaultValue={s.grade ?? ''} onChange={(e) => setEdits({ ...edits, [s.id]: { ...edits[s.id], grade: e.target.value } })} /></div>
            <div className="field" style={{ margin: 0 }}><label>Feedback</label>
              <input className="input" defaultValue={s.feedback ?? ''} onChange={(e) => setEdits({ ...edits, [s.id]: { ...edits[s.id], feedback: e.target.value } })} placeholder="Optional comments" /></div>
            <button className="btn btn-primary" onClick={() => grade(s)}>Save</button>
          </div>
        </div>
      ))}
    </Modal>
  );
}

/* ====================== Quizzes ====================== */
function QuizzesTab({ courseId, manage, canSee }) {
  const toast = useToast();
  const [list, setList] = useState(null);
  const [adding, setAdding] = useState(false);
  const [results, setResults] = useState(null);
  const load = useCallback(() => {
    api.get(`/courses/${courseId}/quizzes`).then((d) => setList(d.quizzes)).catch(() => setList([]));
  }, [courseId]);
  useEffect(() => { load(); }, [load]);

  const remove = async (q) => {
    if (!confirm(`Delete quiz "${q.title}"?`)) return;
    try { await api.del(`/quizzes/${q.id}`); toast('Quiz deleted'); load(); } catch (e) { toast(e.message, 'error'); }
  };
  const showResults = async (q) => {
    try { const d = await api.get(`/quizzes/${q.id}/attempts`); setResults({ quiz: q, attempts: d.attempts }); }
    catch (e) { toast(e.message, 'error'); }
  };

  if (!canSee) return <div className="card"><Empty icon={Lock} title="Enroll to take quizzes" /></div>;
  if (!list) return <Spinner />;

  return (
    <>
      {manage && <div style={{ marginBottom: 16 }}><button className="btn btn-primary" onClick={() => setAdding(true)}><Plus size={17} /> Create quiz</button></div>}
      {list.length === 0 ? (
        <div className="card"><Empty icon={HelpCircle} title="No quizzes yet" text={manage ? 'Add a quiz to test your students.' : 'No quizzes are available.'} /></div>
      ) : (
        <div className="grid grid-3">
          {list.map((q) => (
            <div key={q.id} className="card card-pad">
              <div className="stat-icon" style={{ background: '#ede9fe', color: '#7c3aed', marginBottom: 12 }}><HelpCircle size={26} /></div>
              <h3 style={{ fontSize: 16, marginBottom: 4 }}>{q.title}</h3>
              <p className="muted" style={{ marginBottom: 12 }}>{q.description}</p>
              <div className="meta" style={{ marginBottom: 14 }}>
                <span><Layers size={14} /> {q.question_count} questions</span>
                <span><Timer size={14} /> {q.time_limit_min} min</span>
              </div>
              {manage ? (
                <div className="row-actions" style={{ justifyContent: 'space-between' }}>
                  <button className="btn btn-soft btn-sm" onClick={() => showResults(q)}>{q.attempt_count} attempts</button>
                  <button className="icon-btn" onClick={() => remove(q)}><Trash2 size={17} /></button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Link to={`/quizzes/${q.id}`} className="btn btn-primary btn-sm">{q.best_percent !== null ? 'Retake quiz' : 'Start quiz'}</Link>
                  {q.best_percent !== null && <span className="badge badge-green"><Award size={13} /> Best {q.best_percent}%</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {adding && <QuizBuilder courseId={courseId} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />}
      {results && (
        <Modal title={`Results · ${results.quiz.title}`} onClose={() => setResults(null)}>
          {results.attempts.length === 0 ? <Empty icon={HelpCircle} title="No attempts yet" /> : (
            <table className="table"><thead><tr><th>Student</th><th>Score</th><th>Date</th></tr></thead>
              <tbody>{results.attempts.map((a) => (
                <tr key={a.id}><td>{a.student_name}</td><td><b>{a.score}/{a.total}</b> ({Math.round((100 * a.score) / a.total)}%)</td><td>{fmtDate(a.taken_at)}</td></tr>
              ))}</tbody></table>
          )}
        </Modal>
      )}
    </>
  );
}

function QuizBuilder({ courseId, onClose, onSaved }) {
  const toast = useToast();
  const blank = () => ({ question: '', options: ['', '', '', ''], correct_index: 0 });
  const [meta, setMeta] = useState({ title: '', description: '', time_limit_min: 10 });
  const [qs, setQs] = useState([blank()]);
  const [busy, setBusy] = useState(false);

  const updQ = (i, patch) => setQs(qs.map((q, k) => (k === i ? { ...q, ...patch } : q)));
  const updOpt = (i, j, v) => updQ(i, { options: qs[i].options.map((o, k) => (k === j ? v : o)) });

  const save = async () => {
    if (!meta.title.trim()) return toast('Quiz title is required', 'error');
    // drop empty options but keep the correct index pointing at the same option
    const cleaned = qs.map((q) => {
      const kept = q.options.map((o, idx) => ({ o: o.trim(), idx })).filter((x) => x.o);
      return { question: q.question, options: kept.map((x) => x.o), correct_index: kept.findIndex((x) => x.idx === q.correct_index) };
    });
    setBusy(true);
    try { await api.post(`/courses/${courseId}/quizzes`, { ...meta, questions: cleaned }); toast('Quiz created'); onSaved(); }
    catch (e) { toast(e.message, 'error'); setBusy(false); }
  };

  return (
    <Modal wide title="Create quiz" onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={busy}>Save quiz</button></>}>
      <div className="field"><label>Quiz title</label><input className="input" value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} autoFocus /></div>
      <div className="field-row">
        <div className="field"><label>Description</label><input className="input" value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} /></div>
        <div className="field"><label>Time limit (min)</label><input className="input" type="number" min="1" value={meta.time_limit_min} onChange={(e) => setMeta({ ...meta, time_limit_min: e.target.value })} /></div>
      </div>
      {qs.map((q, i) => (
        <div key={i} className="q-block">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <b>Question {i + 1}</b>
            {qs.length > 1 && <button className="icon-btn" onClick={() => setQs(qs.filter((_, k) => k !== i))}><Trash2 size={16} /></button>}
          </div>
          <input className="input" placeholder="Type the question…" value={q.question} onChange={(e) => updQ(i, { question: e.target.value })} style={{ marginBottom: 10 }} />
          {q.options.map((o, j) => (
            <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <input type="radio" name={`correct-${i}`} checked={q.correct_index === j} onChange={() => updQ(i, { correct_index: j })} title="Mark as correct answer" />
              <input className="input" placeholder={`Option ${String.fromCharCode(65 + j)}`} value={o} onChange={(e) => updOpt(i, j, e.target.value)} />
            </div>
          ))}
          <span className="hint">Select the radio button next to the correct answer.</span>
        </div>
      ))}
      <button className="btn btn-soft" onClick={() => setQs([...qs, blank()])}><Plus size={16} /> Add question</button>
    </Modal>
  );
}

/* ====================== Students ====================== */
function StudentsTab({ courseId }) {
  const [students, setStudents] = useState(null);
  useEffect(() => { api.get(`/courses/${courseId}/students`).then((d) => setStudents(d.students)).catch(() => setStudents([])); }, [courseId]);
  if (!students) return <Spinner />;
  if (!students.length) return <div className="card"><Empty icon={Users} title="No students yet" text="Students who enroll will appear here." /></div>;
  return (
    <div className="card table-wrap">
      <table className="table">
        <thead><tr><th>Student</th><th>Enrolled</th><th style={{ width: 240 }}>Progress</th></tr></thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id}>
              <td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Avatar name={s.name} size="sm" /><div><div className="title-sm">{s.name}</div><div className="muted">{s.email}</div></div></div></td>
              <td>{fmtDate(s.enrolled_at)}</td>
              <td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div style={{ flex: 1 }}><ProgressBar value={s.progress} /></div><b>{s.progress}%</b></div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
