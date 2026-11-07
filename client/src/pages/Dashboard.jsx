import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, CheckCircle2, ClipboardList, Trophy, Target, Users, PenLine, GraduationCap,
  Layers, UserPlus, Library, ArrowRight, Clock,
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { Spinner, StatCard, ProgressBar, Empty, Avatar, RoleBadge, fmtDate, dueLabel, bannerStyle } from '../components/ui';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard').then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!data) return <Spinner />;

  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{greet}, {user.name.split(' ')[0]} 👋</h1>
          <p>
            {data.role === 'student' && "Here's your learning progress at a glance."}
            {data.role === 'instructor' && "Here's how your courses and students are doing."}
            {data.role === 'admin' && 'Platform overview and activity.'}
          </p>
        </div>
        {data.role === 'student' && <Link to="/courses" className="btn btn-primary">Explore courses <ArrowRight size={16} /></Link>}
        {data.role === 'instructor' && <Link to="/courses/new" className="btn btn-primary">+ New course</Link>}
      </div>

      {data.role === 'student' && <StudentView d={data} />}
      {data.role === 'instructor' && <InstructorView d={data} />}
      {data.role === 'admin' && <AdminView d={data} />}
    </>
  );
}

function StudentView({ d }) {
  const s = d.stats;
  return (
    <>
      <div className="stats">
        <StatCard icon={BookOpen} label="Enrolled courses" value={s.enrolled} />
        <StatCard icon={CheckCircle2} label="Completed" value={s.completed} color="#16a34a" bg="#dcfce7" />
        <StatCard icon={ClipboardList} label="Pending assignments" value={s.pendingAssignments} color="#d97706" bg="#fef3c7" />
        <StatCard icon={Trophy} label="Avg. quiz score" value={`${s.avgQuiz}%`} color="#7c3aed" bg="#ede9fe" />
        <StatCard icon={Target} label="Avg. assignment grade" value={`${s.avgGrade}%`} color="#0891b2" bg="#cffafe" />
      </div>

      <div className="grid grid-2">
        <div className="card card-pad">
          <div className="card-title">Continue learning <Link to="/my-courses">View all</Link></div>
          {d.courses.length === 0 ? (
            <Empty icon={Library} title="No courses yet" text="Enroll in a course to start learning." action={<Link to="/courses" className="btn btn-primary btn-sm">Browse catalog</Link>} />
          ) : (
            d.courses.slice(0, 5).map((c) => (
              <Link key={c.id} to={`/courses/${c.id}`} className="list-item" style={{ color: 'inherit' }}>
                <div className="stat-icon" style={{ ...bannerStyle(c.color), color: '#fff', width: 46, height: 46 }}><GraduationCap size={22} /></div>
                <div className="grow">
                  <div className="title-sm">{c.title}</div>
                  <div className="muted" style={{ marginBottom: 7 }}>{c.instructor_name} · {c.lessons_count} lessons</div>
                  <ProgressBar value={c.progress} />
                </div>
                <b style={{ color: 'var(--blue-700)' }}>{c.progress}%</b>
              </Link>
            ))
          )}
        </div>

        <div className="card card-pad">
          <div className="card-title">Upcoming deadlines <Link to="/assignments">All</Link></div>
          {d.deadlines.length === 0 ? (
            <Empty icon={CheckCircle2} title="You're all caught up" text="No pending assignments." />
          ) : (
            d.deadlines.map((a) => {
              const due = dueLabel(a.due_date);
              return (
                <Link key={a.id} to={`/courses/${a.course_id}?tab=assignments`} className="list-item" style={{ color: 'inherit' }}>
                  <div className="grow">
                    <div className="title-sm">{a.title}</div>
                    <div className="muted">{a.course_title}</div>
                  </div>
                  <span className={`badge ${due.cls}`}>{due.text}</span>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

function InstructorView({ d }) {
  const s = d.stats;
  return (
    <>
      <div className="stats">
        <StatCard icon={Layers} label="My courses" value={s.courses} />
        <StatCard icon={Users} label="Total students" value={s.students} color="#0891b2" bg="#cffafe" />
        <StatCard icon={PenLine} label="Awaiting grading" value={s.toGrade} color="#d97706" bg="#fef3c7" />
        <StatCard icon={Trophy} label="Avg. quiz score" value={`${s.avgQuiz}%`} color="#7c3aed" bg="#ede9fe" />
      </div>
      <div className="grid grid-2">
        <div className="card card-pad">
          <div className="card-title">Your courses <Link to="/my-courses">Manage</Link></div>
          {d.courses.length === 0 ? (
            <Empty icon={Library} title="No courses yet" text="Create your first course to get started." action={<Link to="/courses/new" className="btn btn-primary btn-sm">Create course</Link>} />
          ) : (
            d.courses.map((c) => (
              <Link key={c.id} to={`/courses/${c.id}`} className="list-item" style={{ color: 'inherit' }}>
                <div className="stat-icon" style={{ ...bannerStyle(c.color), color: '#fff', width: 46, height: 46 }}><GraduationCap size={22} /></div>
                <div className="grow">
                  <div className="title-sm">{c.title}</div>
                  <div className="muted">{c.lessons_count} lessons · {c.students} students</div>
                </div>
                <span className={`badge ${c.status === 'published' ? 'badge-green' : 'badge-amber'}`}>{c.status}</span>
              </Link>
            ))
          )}
        </div>
        <div className="card card-pad">
          <div className="card-title">Needs grading <Link to="/grading">Open queue</Link></div>
          {d.queue.length === 0 ? (
            <Empty icon={CheckCircle2} title="Nothing to grade" text="All submissions are graded." />
          ) : (
            d.queue.map((q) => (
              <div key={q.id} className="list-item">
                <Avatar name={q.student_name} size="sm" />
                <div className="grow">
                  <div className="title-sm">{q.student_name}</div>
                  <div className="muted">{q.assignment_title} · {q.course_title}</div>
                </div>
                <span className="muted">{fmtDate(q.submitted_at)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

function AdminView({ d }) {
  const s = d.stats;
  const maxSignup = Math.max(1, ...d.signups.map((x) => x.n));
  const maxCat = Math.max(1, ...d.byCategory.map((x) => x.enrollments));
  return (
    <>
      <div className="stats">
        <StatCard icon={Users} label="Total users" value={s.users} />
        <StatCard icon={GraduationCap} label="Students" value={s.students} color="#0891b2" bg="#cffafe" />
        <StatCard icon={UserPlus} label="Instructors" value={s.instructors} color="#7c3aed" bg="#ede9fe" />
        <StatCard icon={Library} label="Courses" value={s.courses} color="#d97706" bg="#fef3c7" />
        <StatCard icon={BookOpen} label="Enrollments" value={s.enrollments} color="#16a34a" bg="#dcfce7" />
      </div>
      <div className="grid grid-eq" style={{ marginBottom: 22 }}>
        <div className="card card-pad">
          <div className="card-title">New sign-ups (last 7 days)</div>
          <div className="bars">
            {d.signups.map((x) => (
              <div className="bar-col" key={x.day}>
                <span className="bar-val">{x.n}</span>
                <div className="bar" style={{ height: `${(x.n / maxSignup) * 100}%` }} />
                <span className="bar-label">{x.day}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card card-pad">
          <div className="card-title">Enrollments by category</div>
          {d.byCategory.map((c) => (
            <div className="hbar" key={c.category}>
              <div className="hbar-top"><span>{c.category}</span><span>{c.enrollments}</span></div>
              <div className="progress"><span style={{ width: `${(c.enrollments / maxCat) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-eq">
        <div className="card card-pad">
          <div className="card-title">Top courses</div>
          {d.topCourses.map((c) => (
            <Link key={c.id} to={`/courses/${c.id}`} className="list-item" style={{ color: 'inherit' }}>
              <div className="stat-icon" style={{ ...bannerStyle(c.color), color: '#fff', width: 42, height: 42 }}><GraduationCap size={20} /></div>
              <div className="grow"><div className="title-sm">{c.title}</div><div className="muted">{c.instructor_name}</div></div>
              <span className="badge badge-blue"><Users size={12} /> {c.students}</span>
            </Link>
          ))}
        </div>
        <div className="card card-pad">
          <div className="card-title">Recent users <Link to="/admin/users">Manage</Link></div>
          {d.recentUsers.map((u) => (
            <div key={u.id} className="list-item">
              <Avatar name={u.name} size="sm" />
              <div className="grow"><div className="title-sm">{u.name}</div><div className="muted">{u.email}</div></div>
              <RoleBadge role={u.role} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
