// Loads demo data (wipes existing rows!).  Usage: npm run db:seed
const bcrypt = require('bcryptjs');
const db = require('../src/db');

const daysFromNow = (d) => new Date(Date.now() + d * 86400000).toISOString();

const COURSES = [
  {
    title: 'Full-Stack Web Development with React & Node',
    category: 'Web Development', level: 'Intermediate', hours: 24, color: '#2563eb', instructor: 0,
    description: 'Build modern, production-ready web apps. Learn React components and hooks, REST APIs with Express, authentication, and PostgreSQL from the ground up.',
    lessons: [
      ['How the Modern Web Works', 'Understand clients, servers, HTTP, and the request/response cycle. We map out the architecture of a full-stack application.', 12],
      ['React Fundamentals: Components & Props', 'Learn JSX, functional components, props, and how to think in components.', 25],
      ['State, Effects & Hooks', 'useState, useEffect, and custom hooks to manage UI state and side-effects.', 30],
      ['Building a REST API with Express', 'Routes, controllers, middleware, validation, and error handling.', 35],
      ['PostgreSQL & SQL Essentials', 'Design relational schemas, write joins, and connect Node to Postgres with pg.', 40],
      ['Authentication with JWT', 'Hash passwords, issue tokens, protect routes, and implement role-based access.', 30],
    ],
    assignments: [
      ['Build a Todo App with React', 'Create a todo list with add, complete and delete features. Submit a short write-up of your approach and a repository link.', 7, 100],
      ['Design a Database Schema', 'Model a library system with at least 4 tables. Describe relationships and include your SQL.', 14, 50],
    ],
    quiz: {
      title: 'React Fundamentals Check', description: 'Test your understanding of React basics.', limit: 10,
      questions: [
        ['Which hook is used to manage local component state?', ['useEffect', 'useState', 'useRef', 'useMemo'], 1],
        ['What does JSX compile to?', ['HTML strings', 'React.createElement calls', 'CSS modules', 'WebAssembly'], 1],
        ['Which prop should be given to items rendered in a list?', ['id', 'index', 'key', 'ref'], 2],
        ['When does useEffect with an empty dependency array run?', ['Every render', 'Only after the first render', 'Never', 'Before render'], 1],
      ],
    },
  },
  {
    title: 'Data Science with Python',
    category: 'Data Science', level: 'Beginner', hours: 18, color: '#0891b2', instructor: 1,
    description: 'Go from zero to analysing real datasets. Learn Python, NumPy, pandas and data visualisation while working on practical projects.',
    lessons: [
      ['Python Basics for Analysts', 'Variables, loops, functions and data structures you will use every day.', 30],
      ['NumPy Arrays & Vectorised Maths', 'Work with n-dimensional arrays and fast numerical operations.', 25],
      ['Data Wrangling with pandas', 'Load, clean, filter, group, and merge tabular data.', 40],
      ['Visualising Data', 'Create clear charts with matplotlib and seaborn and tell a story with data.', 30],
      ['Intro to Machine Learning', 'Train and evaluate your first model using scikit-learn.', 45],
    ],
    assignments: [
      ['Clean a Messy Dataset', 'Use pandas to clean the provided sales dataset and explain each cleaning step.', 10, 100],
    ],
    quiz: {
      title: 'Python & pandas Quiz', description: 'Quick check on core data-science concepts.', limit: 8,
      questions: [
        ['Which library provides the DataFrame structure?', ['NumPy', 'pandas', 'matplotlib', 'requests'], 1],
        ['How do you select a column named "price" in a DataFrame df?', ['df.get_row("price")', 'df["price"]', 'df(price)', 'df->price'], 1],
        ['Which method removes rows with missing values?', ['dropna()', 'fillna()', 'remove()', 'clean()'], 0],
      ],
    },
  },
  {
    title: 'UI/UX Design Principles',
    category: 'Design', level: 'Beginner', hours: 12, color: '#7c3aed', instructor: 2,
    description: 'Learn the fundamentals of user-centred design: research, wireframing, visual hierarchy, colour, typography and usability testing.',
    lessons: [
      ['What is User-Centred Design?', 'The design process from empathy to testing, and why users come first.', 15],
      ['Visual Hierarchy & Layout', 'Guide the eye with size, contrast, spacing, and alignment.', 25],
      ['Colour, Type & Accessibility', 'Choose accessible palettes and readable typography.', 25],
      ['Wireframes & Prototypes', 'Go from sketches to clickable prototypes quickly.', 30],
    ],
    assignments: [
      ['Redesign a Login Screen', 'Pick any app and redesign its login screen. Explain the choices you made using at least 3 design principles.', 9, 100],
    ],
    quiz: {
      title: 'Design Basics Quiz', description: 'Do you know your hierarchy from your hues?', limit: 6,
      questions: [
        ['Which WCAG contrast ratio is the minimum for normal body text (AA)?', ['2:1', '3:1', '4.5:1', '10:1'], 2],
        ['Which is NOT a tool for creating visual hierarchy?', ['Size', 'Contrast', 'Whitespace', 'Random decoration'], 3],
      ],
    },
  },
  {
    title: 'Cloud Computing & DevOps Essentials',
    category: 'Cloud & DevOps', level: 'Intermediate', hours: 20, color: '#0ea5e9', instructor: 0,
    description: 'Containers, CI/CD pipelines, infrastructure as code and cloud deployment. Ship software faster and more reliably.',
    lessons: [
      ['Linux & the Command Line', 'The terminal skills every engineer needs.', 30],
      ['Docker: Containers Explained', 'Build, run and ship containers with Docker and Compose.', 40],
      ['CI/CD with GitHub Actions', 'Automate testing and deployment on every push.', 35],
      ['Deploying to the Cloud', 'Deploy a containerised app to a managed cloud platform.', 40],
    ],
    assignments: [
      ['Dockerise Your App', 'Write a Dockerfile for a Node app and explain each instruction.', 12, 100],
    ],
    quiz: null,
  },
  {
    title: 'Digital Marketing Fundamentals',
    category: 'Marketing', level: 'Beginner', hours: 10, color: '#f59e0b', instructor: 2,
    description: 'SEO, content, email and paid social in one practical course. Plan and measure a campaign end to end.',
    lessons: [
      ['The Marketing Funnel', 'Awareness, consideration, conversion and retention explained.', 15],
      ['SEO Basics', 'Keywords, on-page SEO, and links.', 25],
      ['Email & Content Marketing', 'Write emails and content people actually read.', 20],
    ],
    assignments: [],
    quiz: null,
  },
  {
    title: 'Advanced SQL & Database Design',
    category: 'Data Science', level: 'Advanced', hours: 16, color: '#1d4ed8', instructor: 1,
    description: 'Window functions, CTEs, indexing strategy, query plans, and designing schemas that scale — all on PostgreSQL.',
    lessons: [
      ['Window Functions', 'RANK, LAG, LEAD, and running totals.', 35],
      ['CTEs & Recursive Queries', 'Write readable, composable SQL.', 30],
      ['Indexes & Query Plans', 'Read EXPLAIN output and speed up slow queries.', 40],
    ],
    assignments: [
      ['Optimise a Slow Query', 'Given the provided query, improve its performance and show the before/after EXPLAIN.', 15, 100],
    ],
    quiz: null,
  },
];

(async () => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `TRUNCATE announcements, quiz_attempts, quiz_questions, quizzes, submissions, assignments,
                lesson_progress, enrollments, lessons, courses, users RESTART IDENTITY CASCADE`
    );

    const hash = await bcrypt.hash('Password@123', 10);
    const adminHash = await bcrypt.hash('Admin@123', 10);

    const mkUser = async (name, email, role, h, bio = '') =>
      (await client.query(
        `INSERT INTO users (name, email, password_hash, role, bio) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [name, email, h, role, bio]
      )).rows[0].id;

    const admin = await mkUser('Alex Morgan', 'admin@edunova.com', 'admin', adminHash, 'Platform administrator.');
    const instructors = [
      await mkUser('Dr. Priya Sharma', 'priya@edunova.com', 'instructor', hash, 'Senior software engineer and educator with 10+ years of experience.'),
      await mkUser('Prof. Daniel Carter', 'daniel@edunova.com', 'instructor', hash, 'Data scientist and university lecturer.'),
      await mkUser('Sofia Martinez', 'sofia@edunova.com', 'instructor', hash, 'Product designer and marketing strategist.'),
    ];
    const studentNames = ['Aarav Patel', 'Emma Johnson', 'Liam Nguyen', 'Olivia Brown', 'Noah Williams', 'Sara Ahmed', 'Rohan Das', 'Mia Chen'];
    const students = [];
    for (let i = 0; i < studentNames.length; i++) {
      const email = i === 0 ? 'student@edunova.com' : studentNames[i].toLowerCase().replace(/ /g, '.') + '@mail.com';
      students.push(await mkUser(studentNames[i], email, 'student', hash));
    }

    const courseIds = [];
    const lessonIds = []; // [courseIndex] -> [ids]
    const assignmentIds = [];
    const quizIds = [];

    for (const [ci, c] of COURSES.entries()) {
      const cid = (await client.query(
        `INSERT INTO courses (title, description, category, level, duration_hours, color, instructor_id, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'published') RETURNING id`,
        [c.title, c.description, c.category, c.level, c.hours, c.color, instructors[c.instructor]]
      )).rows[0].id;
      courseIds.push(cid);
      lessonIds[ci] = [];
      assignmentIds[ci] = [];

      for (const [li, l] of c.lessons.entries()) {
        const lid = (await client.query(
          `INSERT INTO lessons (course_id, title, content, duration_min, position) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
          [cid, l[0], l[1] + '\n\nKey takeaways:\n• Understand the core idea\n• Practise with the examples\n• Complete the lesson to track your progress', l[2], li + 1]
        )).rows[0].id;
        lessonIds[ci].push(lid);
      }
      for (const a of c.assignments) {
        const aid = (await client.query(
          `INSERT INTO assignments (course_id, title, description, due_date, max_points) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
          [cid, a[0], a[1], daysFromNow(a[2]), a[3]]
        )).rows[0].id;
        assignmentIds[ci].push(aid);
      }
      if (c.quiz) {
        const qid = (await client.query(
          `INSERT INTO quizzes (course_id, title, description, time_limit_min) VALUES ($1,$2,$3,$4) RETURNING id`,
          [cid, c.quiz.title, c.quiz.description, c.quiz.limit]
        )).rows[0].id;
        quizIds[ci] = qid;
        for (const [qi, q] of c.quiz.questions.entries()) {
          await client.query(
            `INSERT INTO quiz_questions (quiz_id, question, options, correct_index, position) VALUES ($1,$2,$3,$4,$5)`,
            [qid, q[0], JSON.stringify(q[1]), q[2], qi + 1]
          );
        }
      }
    }

    // Enrollments + progress (student index -> list of [courseIndex, lessonsDone])
    const plan = {
      0: [[0, 4], [1, 2], [2, 4]],
      1: [[0, 6], [1, 3]],
      2: [[0, 2], [3, 1]],
      3: [[1, 5], [4, 2]],
      4: [[0, 1], [5, 1]],
      5: [[2, 3], [4, 3]],
      6: [[3, 4], [5, 2], [0, 3]],
      7: [[1, 1], [2, 2]],
    };
    for (const [si, list] of Object.entries(plan)) {
      for (const [ci, done] of list) {
        await client.query('INSERT INTO enrollments (course_id, student_id) VALUES ($1,$2)', [courseIds[ci], students[si]]);
        for (let k = 0; k < done && k < lessonIds[ci].length; k++) {
          await client.query('INSERT INTO lesson_progress (lesson_id, student_id) VALUES ($1,$2)', [lessonIds[ci][k], students[si]]);
        }
      }
    }

    // Some submissions (some graded, some waiting)
    const subs = [
      [0, 0, 0, 'Built a todo app using React hooks with localStorage persistence. Repo: github.com/aarav/todo-react. I used useReducer for state.', 92, 'Excellent work! Clean component structure. Consider adding tests next time.'],
      [1, 0, 0, 'Todo app with filtering and drag-to-reorder. Deployed on Netlify.', 97, 'Outstanding — the drag-and-drop was a great extra touch.'],
      [2, 0, 0, 'Todo app, still missing delete confirmation but everything else works.', null, null],
      [6, 0, 0, 'My todo app uses context + reducer. Includes keyboard shortcuts.', null, null],
      [3, 1, 0, 'Cleaned the sales dataset: dropped duplicates, parsed dates, filled missing prices with the median.', 88, 'Good approach. Explain why you chose the median.'],
      [5, 2, 0, 'Redesigned the login screen with a clearer hierarchy and larger touch targets.', null, null],
    ];
    for (const [si, ci, ai, content, grade, feedback] of subs) {
      await client.query(
        `INSERT INTO submissions (assignment_id, student_id, content, submitted_at, grade, feedback, graded_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [assignmentIds[ci][ai], students[si], content, daysFromNow(-2), grade, feedback, grade !== null ? daysFromNow(-1) : null]
      );
    }

    // Quiz attempts
    const attempts = [[0, 0, 3, 4], [1, 0, 4, 4], [3, 1, 2, 3], [0, 1, 1, 3]];
    for (const [si, ci, score, total] of attempts) {
      if (quizIds[ci]) {
        await client.query(
          `INSERT INTO quiz_attempts (quiz_id, student_id, score, total, taken_at) VALUES ($1,$2,$3,$4,$5)`,
          [quizIds[ci], students[si], score, total, daysFromNow(-3)]
        );
      }
    }

    // Announcements
    await client.query(
      `INSERT INTO announcements (course_id, author_id, title, body, created_at) VALUES
       (NULL, $1, 'Welcome to EduNova! 🎓', 'We are thrilled to launch our new learning platform. Browse the catalog, enroll in a course, and start learning today.', $5),
       ($2, $3, 'Week 2 live Q&A session', 'Join me this Friday for a live Q&A on React hooks. Bring your questions and code!', $6),
       ($4, $7, 'New lesson added', 'I just added a lesson on recursive queries. Take a look when you have time.', $6)`,
      [admin, courseIds[0], instructors[0], courseIds[5], daysFromNow(-7), daysFromNow(-1), instructors[1]]
    );

    await client.query('COMMIT');
    console.log('✔ Demo data loaded.\n');
    console.log('  Admin       admin@edunova.com    / Admin@123');
    console.log('  Instructor  priya@edunova.com    / Password@123');
    console.log('  Student     student@edunova.com  / Password@123\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('✖ Seeding failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await db.pool.end();
  }
})();
