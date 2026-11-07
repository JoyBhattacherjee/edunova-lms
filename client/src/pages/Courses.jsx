import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Library } from 'lucide-react';
import { api } from '../api';
import CourseCard from '../components/CourseCard';
import { Spinner, Empty } from '../components/ui';

export default function Courses() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [category, setCategory] = useState('All');
  const [level, setLevel] = useState('All');
  const [categories, setCategories] = useState([]);
  const [courses, setCourses] = useState(null);

  // keep the input in sync when the top search bar changes the URL
  useEffect(() => { setQ(params.get('q') || ''); }, [params]);

  useEffect(() => {
    api.get('/courses/categories').then((d) => setCategories(d.categories)).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      const qs = new URLSearchParams();
      if (q) qs.set('q', q);
      if (category !== 'All') qs.set('category', category);
      if (level !== 'All') qs.set('level', level);
      api.get(`/courses?${qs}`).then((d) => setCourses(d.courses)).catch(() => setCourses([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q, category, level]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Explore courses</h1>
          <p>Find the right course and start learning today.</p>
        </div>
      </div>

      <div className="toolbar">
        <div className="input-icon">
          <Search size={17} />
          <input
            className="input" placeholder="Search by title, topic or instructor…" value={q}
            onChange={(e) => { setQ(e.target.value); setParams(e.target.value ? { q: e.target.value } : {}); }}
          />
        </div>
        <select className="select" value={level} onChange={(e) => setLevel(e.target.value)}>
          {['All', 'Beginner', 'Intermediate', 'Advanced'].map((l) => <option key={l} value={l}>{l === 'All' ? 'All levels' : l}</option>)}
        </select>
      </div>

      <div className="chips" style={{ marginBottom: 24 }}>
        {['All', ...categories].map((c) => (
          <button key={c} className={`chip ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>{c}</button>
        ))}
      </div>

      {!courses ? (
        <Spinner />
      ) : courses.length === 0 ? (
        <div className="card"><Empty icon={Library} title="No courses found" text="Try a different search or clear the filters." /></div>
      ) : (
        <div className="grid grid-3">
          {courses.map((c) => <CourseCard key={c.id} course={c} />)}
        </div>
      )}
    </>
  );
}
