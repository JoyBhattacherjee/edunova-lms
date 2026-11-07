import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Timer, RotateCcw } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { Spinner, useToast } from '../components/ui';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function QuizPlayer() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [secs, setSecs] = useState(0);
  const [busy, setBusy] = useState(false);
  const submitted = useRef(false);

  useEffect(() => {
    api.get(`/quizzes/${id}`)
      .then((d) => { setData(d); setSecs(d.quiz.time_limit_min * 60); setAnswers(new Array(d.questions.length).fill(null)); })
      .catch((e) => setError(e.message));
  }, [id]);

  // countdown
  useEffect(() => {
    if (!data || result) return;
    if (secs <= 0) { submit(true); return; }
    const t = setTimeout(() => setSecs((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secs, data, result]); // eslint-disable-line

  const submit = async (auto = false) => {
    if (submitted.current) return;
    submitted.current = true;
    setBusy(true);
    try {
      const r = await api.post(`/quizzes/${id}/attempt`, { answers });
      setResult(r);
      if (auto) toast("Time's up — your quiz was submitted", 'error');
    } catch (e) { toast(e.message, 'error'); submitted.current = false; } finally { setBusy(false); }
  };

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!data) return <Spinner />;
  if (user.role !== 'student') return <div className="alert alert-info">Only students can take quizzes. Use the course page to review quiz results.</div>;

  const { quiz, questions } = data;
  const back = <Link to={`/courses/${quiz.course_id}?tab=quizzes`} className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, marginBottom: 16 }}><ArrowLeft size={16} /> Back to course</Link>;

  if (result) {
    const pct = Math.round((100 * result.score) / result.total);
    return (
      <div className="quiz-wrap">
        {back}
        <div className="card card-pad" style={{ textAlign: 'center', marginBottom: 22 }}>
          <div className="score-ring" style={{ background: `conic-gradient(var(--blue-600) ${pct * 3.6}deg, var(--blue-100) 0deg)` }}><span>{pct}%</span></div>
          <h2>{pct >= 80 ? 'Excellent work! 🎉' : pct >= 50 ? 'Good effort! 👍' : 'Keep practising 💪'}</h2>
          <p className="muted" style={{ margin: '6px 0 18px' }}>You answered {result.score} of {result.total} questions correctly.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => navigate(0)}><RotateCcw size={16} /> Retake quiz</button>
            <Link className="btn btn-ghost" to={`/courses/${quiz.course_id}?tab=quizzes`}>Back to course</Link>
          </div>
        </div>
        <h3 style={{ marginBottom: 14 }}>Review answers</h3>
        {result.review.map((r, i) => (
          <div key={i} className="card card-pad" style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>{i + 1}. {r.question}</div>
            {r.options.map((o, j) => (
              <div key={j} className={`option ${j === r.correct_index ? 'correct' : j === r.chosen ? 'wrong' : ''}`} style={{ cursor: 'default' }}>
                <span className="letter">{LETTERS[j]}</span> {o}
                {j === r.correct_index && <Check size={18} style={{ marginLeft: 'auto', color: 'var(--success)' }} />}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  const q = questions[step];
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  const answered = answers.filter((a) => a !== null).length;

  return (
    <div className="quiz-wrap">
      {back}
      <div className="card card-pad">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <div><h2 style={{ fontSize: 20 }}>{quiz.title}</h2><span className="muted">Question {step + 1} of {questions.length} · {answered} answered</span></div>
          <span className={`badge ${secs < 30 ? 'badge-red' : 'badge-blue'}`} style={{ fontSize: 15, padding: '6px 14px' }}><Timer size={15} /> {mm}:{ss}</span>
        </div>
        <div className="progress" style={{ marginBottom: 26 }}><span style={{ width: `${((step + 1) / questions.length) * 100}%` }} /></div>

        <h3 style={{ fontSize: 19, marginBottom: 18 }}>{q.question}</h3>
        {q.options.map((o, j) => (
          <button key={j} className={`option ${answers[step] === j ? 'selected' : ''}`} onClick={() => setAnswers(answers.map((a, k) => (k === step ? j : a)))}>
            <span className="letter">{LETTERS[j]}</span> {o}
          </button>
        ))}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 22 }}>
          <button className="btn btn-ghost" disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowLeft size={16} /> Previous</button>
          {step < questions.length - 1 ? (
            <button className="btn btn-primary" onClick={() => setStep(step + 1)}>Next <ArrowRight size={16} /></button>
          ) : (
            <button className="btn btn-primary" disabled={busy} onClick={() => { if (answered < questions.length && !confirm('Some questions are unanswered. Submit anyway?')) return; submit(); }}>
              <Check size={16} /> Submit quiz
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
