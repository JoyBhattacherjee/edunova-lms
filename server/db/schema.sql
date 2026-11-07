-- EduNova LMS database schema (PostgreSQL 12+)
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(120)  NOT NULL,
  email         VARCHAR(190)  NOT NULL UNIQUE,
  password_hash TEXT          NOT NULL,
  role          VARCHAR(20)   NOT NULL DEFAULT 'student'
                CHECK (role IN ('admin', 'instructor', 'student')),
  bio           TEXT          DEFAULT '',
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS courses (
  id            SERIAL PRIMARY KEY,
  title         VARCHAR(200)  NOT NULL,
  description   TEXT          NOT NULL DEFAULT '',
  category      VARCHAR(80)   NOT NULL DEFAULT 'General',
  level         VARCHAR(20)   NOT NULL DEFAULT 'Beginner'
                CHECK (level IN ('Beginner', 'Intermediate', 'Advanced')),
  duration_hours NUMERIC(5,1) NOT NULL DEFAULT 1,
  status        VARCHAR(20)   NOT NULL DEFAULT 'published'
                CHECK (status IN ('draft', 'published')),
  color         VARCHAR(20)   NOT NULL DEFAULT '#2563eb',
  instructor_id INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_courses_instructor ON courses(instructor_id);

CREATE TABLE IF NOT EXISTS lessons (
  id            SERIAL PRIMARY KEY,
  course_id     INTEGER      NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title         VARCHAR(200) NOT NULL,
  content       TEXT         NOT NULL DEFAULT '',
  video_url     TEXT         DEFAULT '',
  duration_min  INTEGER      NOT NULL DEFAULT 10,
  position      INTEGER      NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id, position);

CREATE TABLE IF NOT EXISTS enrollments (
  id          SERIAL PRIMARY KEY,
  course_id   INTEGER     NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id  INTEGER     NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (course_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);

CREATE TABLE IF NOT EXISTS lesson_progress (
  id           SERIAL PRIMARY KEY,
  lesson_id    INTEGER     NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  student_id   INTEGER     NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (lesson_id, student_id)
);

CREATE TABLE IF NOT EXISTS assignments (
  id          SERIAL PRIMARY KEY,
  course_id   INTEGER      NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title       VARCHAR(200) NOT NULL,
  description TEXT         NOT NULL DEFAULT '',
  due_date    TIMESTAMPTZ,
  max_points  INTEGER      NOT NULL DEFAULT 100,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_assignments_course ON assignments(course_id);

CREATE TABLE IF NOT EXISTS submissions (
  id            SERIAL PRIMARY KEY,
  assignment_id INTEGER     NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id    INTEGER     NOT NULL REFERENCES users(id)       ON DELETE CASCADE,
  content       TEXT        NOT NULL DEFAULT '',
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  grade         INTEGER,
  feedback      TEXT,
  graded_at     TIMESTAMPTZ,
  UNIQUE (assignment_id, student_id)
);

CREATE TABLE IF NOT EXISTS quizzes (
  id             SERIAL PRIMARY KEY,
  course_id      INTEGER      NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title          VARCHAR(200) NOT NULL,
  description    TEXT         NOT NULL DEFAULT '',
  time_limit_min INTEGER      NOT NULL DEFAULT 10,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quizzes_course ON quizzes(course_id);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id            SERIAL PRIMARY KEY,
  quiz_id       INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question      TEXT    NOT NULL,
  options       JSONB   NOT NULL,
  correct_index INTEGER NOT NULL,
  position      INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_questions_quiz ON quiz_questions(quiz_id, position);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id         SERIAL PRIMARY KEY,
  quiz_id    INTEGER     NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id INTEGER     NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  score      INTEGER     NOT NULL,
  total      INTEGER     NOT NULL,
  answers    JSONB       NOT NULL DEFAULT '[]',
  taken_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_attempts_student ON quiz_attempts(student_id, quiz_id);

CREATE TABLE IF NOT EXISTS announcements (
  id         SERIAL PRIMARY KEY,
  course_id  INTEGER     REFERENCES courses(id) ON DELETE CASCADE,  -- NULL = visible to everyone
  author_id  INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      VARCHAR(200) NOT NULL,
  body       TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
