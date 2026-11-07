import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Compass, BookOpen, ClipboardList, Megaphone, Users, LogOut, GraduationCap,
  Menu, Search, UserCircle, PenLine, PlusCircle, Settings2,
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { Avatar, RoleBadge } from './ui';

const NAV = {
  student: [
    ['/', 'Dashboard', LayoutDashboard, true],
    ['/courses', 'Explore Courses', Compass],
    ['/my-courses', 'My Learning', BookOpen],
    ['/assignments', 'Assignments', ClipboardList],
    ['/announcements', 'Announcements', Megaphone],
  ],
  instructor: [
    ['/', 'Dashboard', LayoutDashboard, true],
    ['/my-courses', 'My Courses', BookOpen],
    ['/courses/new', 'Create Course', PlusCircle],
    ['/grading', 'Grading Queue', PenLine],
    ['/courses', 'Course Catalog', Compass],
    ['/announcements', 'Announcements', Megaphone],
  ],
  admin: [
    ['/', 'Dashboard', LayoutDashboard, true],
    ['/admin/users', 'Manage Users', Users],
    ['/my-courses', 'All Courses', BookOpen],
    ['/courses/new', 'Create Course', PlusCircle],
    ['/grading', 'Grading Queue', PenLine],
    ['/announcements', 'Announcements', Megaphone],
  ],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const links = NAV[user.role] || NAV.student;

  const onSearch = (e) => {
    e.preventDefault();
    if (q.trim()) navigate(`/courses?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div className="app">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><GraduationCap size={22} color="#fff" /></div>
          <div>EduNova<small>LEARNING PORTAL</small></div>
        </div>
        <div className="nav-label">Menu</div>
        <nav onClick={() => setOpen(false)}>
          {links.map(([to, label, Icon, end]) => (
            <NavLink key={to} to={to} end={end || to === '/courses'} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Icon size={19} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="nav-label">Account</div>
        <NavLink to="/profile" onClick={() => setOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Settings2 size={19} /> Profile & Settings
        </NavLink>
        <div className="sidebar-foot">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Avatar name={user.name} size="sm" />
            <div style={{ minWidth: 0 }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
              <div style={{ fontSize: 12, textTransform: 'capitalize', color: '#93c5fd' }}>{user.role}</div>
            </div>
          </div>
          <button className="btn btn-block btn-sm" style={{ background: 'rgba(255,255,255,.1)', color: '#fff' }} onClick={logout}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>
      <div className={`overlay ${open ? 'show' : ''}`} onClick={() => setOpen(false)} />

      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={22} /></button>
          <form className="search input-icon" onSubmit={onSearch}>
            <Search size={17} />
            <input className="input" placeholder="Search courses, topics or instructors…" value={q} onChange={(e) => setQ(e.target.value)} />
          </form>
          <div className="topbar-right">
            <RoleBadge role={user.role} />
            <NavLink to="/profile" title="Profile"><UserCircle size={26} color="#2563eb" /></NavLink>
          </div>
        </header>
        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
