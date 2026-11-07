import { Link } from 'react-router-dom';
import { BookOpen, Clock, Users, GraduationCap } from 'lucide-react';
import { ProgressBar, bannerStyle } from './ui';
import { useAuth } from '../AuthContext';

export default function CourseCard({ course }) {
  const { user } = useAuth();
  const c = course;
  return (
    <Link to={`/courses/${c.id}`} className="card course-card" style={{ color: 'inherit' }}>
      <div className="course-banner" style={bannerStyle(c.color)}>
        <span className="badge" style={{ background: 'rgba(255,255,255,.22)', color: '#fff' }}>
          {c.category}
        </span>
        {c.status === 'draft' && <span className="badge badge-amber">Draft</span>}
        <GraduationCap size={34} style={{ opacity: 0.85 }} />
      </div>
      <div className="course-body">
        <h3>{c.title}</h3>
        <p>{c.description}</p>
        <div className="meta">
          <span><BookOpen size={14} /> {c.lessons_count} lessons</span>
          <span><Clock size={14} /> {Number(c.duration_hours)}h</span>
          <span><Users size={14} /> {c.enrolled_count}</span>
        </div>
        <div className="muted">
          by <b style={{ color: 'var(--text)' }}>{c.instructor_name}</b> · <span className="badge badge-gray">{c.level}</span>
        </div>
        <div className="course-foot">
          {user.role === 'student' && c.is_enrolled ? (
            <>
              <div className="hbar-top"><span>Progress</span><span>{c.progress}%</span></div>
              <ProgressBar value={c.progress} />
            </>
          ) : (
            <span className="btn btn-soft btn-sm btn-block">
              {user.role === 'student' ? 'View course' : 'Open course'}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
