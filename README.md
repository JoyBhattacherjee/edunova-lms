# 🎓 EduNova — Learning Management Portal

A full-stack learning management system (LMS) with a modern **blue-themed** UI.
Students learn and take quizzes, instructors build courses and grade work, and admins manage the platform.

**Stack:** React 18 (Vite) · Node.js + Express · PostgreSQL · JWT auth

---

## ✨ Features

| Role | What they can do |
|------|------------------|
| **Student** | Browse & search courses · enroll · read lessons · mark lessons complete (progress bar) · submit assignments · take timed, auto-graded quizzes with answer review · see grades & feedback · dashboard with deadlines and averages |
| **Instructor** | Create/edit/delete courses (draft or published) · add lessons · create assignments · build multiple-choice quizzes · grade submissions with feedback · see student roster & progress · post course announcements |
| **Admin** | Platform dashboard with charts · manage all users (change roles, delete) · manage any course · platform-wide announcements |

Security highlights: bcrypt password hashing, JWT sessions, role-based access control on every endpoint, ownership checks (instructors can only edit their own courses), server-side quiz grading (correct answers are never sent to students), lesson content locked until enrollment, Helmet + CORS.

## 📁 Project structure

```
edunova-lms/
├── server/                 # Node.js + Express API
│   ├── db/schema.sql       # PostgreSQL tables
│   ├── scripts/            # migrate.js, seed.js
│   ├── src/                # index.js, db.js, middleware/, routes/
│   └── .env.example
└── client/                 # React (Vite) app
    ├── src/                # pages/, components/, api.js, AuthContext.jsx
    └── .env.example
```

---

## 🚀 Run it locally

**Prerequisites:** Node.js 18+ and a PostgreSQL database (local install, or a free hosted one — see below).

### 1. Create the database

Local PostgreSQL:
```bash
psql -U postgres -c "CREATE DATABASE edunova;"
```

### 2. Start the API

```bash
cd server
cp .env.example .env        # Windows: copy .env.example .env
# open .env and set DATABASE_URL and JWT_SECRET (see next section)
npm install
npm run db:setup            # creates tables + loads demo data
npm run dev                 # API on http://localhost:5000
```

### 3. Start the web app (new terminal)

```bash
cd client
npm install
npm run dev                 # App on http://localhost:5173
```

Open **http://localhost:5173** and use the one-click demo buttons on the login page, or:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@edunova.com | Admin@123 |
| Instructor | priya@edunova.com | Password@123 |
| Student | student@edunova.com | Password@123 |

> ⚠️ `npm run db:seed` **wipes all data**. Use `npm run db:migrate` (safe, idempotent) if you only want to create tables, and **never run the seed on a production database** with real users.

---

## 🔌 Connect your real PostgreSQL database

All database settings live in **one place**: `server/.env`.

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
PG_SSL=false
```

### Option A — PostgreSQL on your own machine
```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/edunova
PG_SSL=false
```

### Option B — Free hosted PostgreSQL (recommended for deployment)
Create a database on **Neon**, **Supabase**, **Render** or **Railway**, copy the *connection string* they give you, and paste it:

```env
DATABASE_URL=postgresql://user:password@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require
PG_SSL=true          # hosted databases almost always require SSL
```

Then run once: `cd server && npm run db:setup` (or `npm run db:migrate` for an empty production DB with no demo data).

**Special characters in the password?** URL-encode them (`@` → `%40`, `#` → `%23`, `/` → `%2F`).

**Generate a strong JWT secret:**
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**Check the connection:** with the API running open http://localhost:5000/api/health — you should see `"database":"connected"`.

---

## 🐙 Upload the project to GitHub

`.gitignore` is already set up so `node_modules` and your secret `.env` files are **never** uploaded.

### 1. Create an empty repository on GitHub
Go to https://github.com/new → name it `edunova-lms` → leave **"Add a README"**, **.gitignore** and **license UNCHECKED** → **Create repository**.

### 2. Push from your computer
Open a terminal in the project root (the folder containing `server/` and `client/`):

```bash
git init
git add .
git status                      # double-check: .env and node_modules must NOT be listed
git commit -m "Initial commit: EduNova LMS"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/edunova-lms.git
git push -u origin main
```

When asked to sign in, use a **Personal Access Token** as the password (GitHub → Settings → Developer settings → Personal access tokens), or use SSH / GitHub Desktop / `gh auth login` if you prefer.

### 3. Later changes
```bash
git add .
git commit -m "Describe your change"
git push
```

> 🔒 If you ever commit a real password by mistake, change that password immediately — removing the file is not enough because it stays in Git history.

---

## ☁️ Deploying (optional)

1. **Database:** Neon / Supabase / Render Postgres (see Option B).
2. **API:** deploy `server/` to Render, Railway or Fly.io. Set environment variables: `DATABASE_URL`, `PG_SSL=true`, `JWT_SECRET`, `CLIENT_URL=https://your-frontend-domain`. Start command: `npm start`. Run `npm run db:migrate` once.
3. **Frontend:** deploy `client/` to Vercel or Netlify (build: `npm run build`, output: `dist`). Set `VITE_API_URL=https://your-api-domain/api`. For Netlify/Vercel add a rewrite of all paths to `/index.html` so React Router works on refresh.

---

## 🧩 API overview

All routes are prefixed with `/api` and (except login/register/health) require `Authorization: Bearer <token>`.

| Area | Endpoints |
|------|-----------|
| Auth | `POST /auth/register` · `POST /auth/login` · `GET /auth/me` · `PUT /auth/profile` |
| Courses | `GET /courses` · `GET /courses/mine` · `GET/POST/PUT/DELETE /courses/:id` · `POST/DELETE /courses/:id/enroll` · `GET /courses/:id/students` |
| Lessons | `POST /courses/:id/lessons` · `PUT/DELETE /lessons/:id` · `POST /lessons/:id/complete` |
| Assignments | `GET/POST /courses/:id/assignments` · `POST /assignments/:id/submit` · `GET /assignments/:id/submissions` · `PUT /submissions/:id/grade` · `GET /assignments/mine` · `GET /assignments/grading-queue` |
| Quizzes | `GET/POST /courses/:id/quizzes` · `GET /quizzes/:id` · `POST /quizzes/:id/attempt` · `GET /quizzes/:id/attempts` |
| Other | `GET/POST/DELETE /announcements` · `GET /dashboard` · `GET/PUT/DELETE /admin/users` |

## 🛠 Ideas for next steps
File uploads for assignments, email notifications, course reviews/ratings, certificates on completion, payments, and automated tests.

---
Made with ❤️ — feel free to use this in your portfolio.
