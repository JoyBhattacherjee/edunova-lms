import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Library } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import CourseCard from '../components/CourseCard';
import { Spinner, Empty } from '../components/ui';

export default function MyCourses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState(null);

  useEffect(() => {
    api.get('/courses/mine').then((d) => setCourses(d.courses)).catch(() => setCourses([]));
  }, []);

  const student = user.role === 'student';
  const title = student ? 'My learning' : user.role === 'admin' ? 'All courses' : 'My courses';

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{title}</h1>
          <p>{student ? 'Pick up right where you left off.' : 'Create and manage your course content.'}</p>
        </div>
        {!student && <Link to="/courses/new" className="btn btn-primary">+ New course</Link>}
      </div>
      {!courses ? (
        <Spinner />
      ) : courses.length === 0 ? (
        <div className="card">
          <Empty
            icon={Library}
            title={student ? "You haven't enrolled in any course yet" : "You haven't created a course yet"}
            text={student ? 'Browse the catalog and enroll to start learning.' : 'Share your knowledge with learners.'}
            action={<Link to={student ? '/courses' : '/courses/new'} className="btn btn-primary">{student ? 'Browse courses' : 'Create course'}</Link>}
          />
        </div>
      ) : (
        <div className="grid grid-3">{courses.map((c) => <CourseCard key={c.id} course={c} />)}</div>
      )}
    </>
  );
}
