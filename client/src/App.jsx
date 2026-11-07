import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Layout from './components/Layout';
import { Spinner } from './components/ui';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import MyCourses from './pages/MyCourses';
import CourseDetail from './pages/CourseDetail';
import CourseForm from './pages/CourseForm';
import Assignments from './pages/Assignments';
import Grading from './pages/Grading';
import Announcements from './pages/Announcements';
import AdminUsers from './pages/AdminUsers';
import Profile from './pages/Profile';
import QuizPlayer from './pages/QuizPlayer';

function Protected({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  return user ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />

      <Route element={<Protected><Layout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="courses" element={<Courses />} />
        <Route path="courses/new" element={<Protected roles={['instructor', 'admin']}><CourseForm /></Protected>} />
        <Route path="courses/:id/edit" element={<Protected roles={['instructor', 'admin']}><CourseForm /></Protected>} />
        <Route path="courses/:id" element={<CourseDetail />} />
        <Route path="quizzes/:id" element={<QuizPlayer />} />
        <Route path="my-courses" element={<MyCourses />} />
        <Route path="assignments" element={<Protected roles={['student']}><Assignments /></Protected>} />
        <Route path="grading" element={<Protected roles={['instructor', 'admin']}><Grading /></Protected>} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="admin/users" element={<Protected roles={['admin']}><AdminUsers /></Protected>} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
