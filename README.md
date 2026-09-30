
# 🧠 ShikshakIQ — AI-Powered Educational Intelligence Platform

<p align="center">
  <img src="https://img.shields.io/badge/Flask-2.3.3-000?logo=flask" alt="Flask" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Gemini%20AI-Google-4285F4?logo=google" alt="Gemini AI" />
  <img src="https://img.shields.io/badge/BKT-Bayesian-8B5CF6" alt="BKT" />
  <img src="https://img.shields.io/badge/IRT-Item%20Response-06B6D4" alt="IRT" />
  <img src="https://img.shields.io/badge/11-Languages-22C55E" alt="11 Languages" />
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License" />
</p>

---

## 📸 Screenshots

> All screenshots captured at 1280×800 resolution using the demo accounts.

### 🏠 Landing & Login

<table>
  <tr>
    <td align="center" width="33%">
      <img src="screenshots/landing-page.png" alt="Landing Page" width="100%" /><br/>
      <sub><b>Landing Page</b> — Hero with AI tagline & portal buttons</sub>
    </td>
    <td align="center" width="33%">
      <img src="screenshots/student-login.png" alt="Student Login" width="100%" /><br/>
      <sub><b>Student Portal Login</b> — Student authentication form</sub>
    </td>
    <td align="center" width="33%">
      <img src="screenshots/teacher-login.png" alt="Teacher Login" width="100%" /><br/>
      <sub><b>Teacher Login</b> — Sign-in for teachers & principals</sub>
    </td>
  </tr>
</table>

### 👨‍🎓 Student Portal

<table>
  <tr>
    <td align="center" width="100%">
      <img src="screenshots/student-dashboard.png" alt="Student Dashboard" width="100%" /><br/>
      <sub><b>Student Dashboard</b> — Progress tracking, concept mastery & practice quizzes</sub>
    </td>
  </tr>
</table>

### 👩‍🏫 Teacher Portal

<table>
  <tr>
    <td align="center" width="33%">
      <img src="screenshots/teacher-dashboard.png" alt="Teacher Dashboard" width="100%" /><br/>
      <sub><b>Dashboard</b> — Class overview with at-risk alerts</sub>
    </td>
    <td align="center" width="33%">
      <img src="screenshots/teacher-quiz-generation.png" alt="Quiz Generation" width="100%" /><br/>
      <sub><b>Quiz Generation</b> — AI-powered quiz creation</sub>
    </td>
    <td align="center" width="33%">
      <img src="screenshots/teacher-paper-analysis.png" alt="Paper Analysis" width="100%" /><br/>
      <sub><b>Paper Analysis</b> — Answer sheet scanning with camera/upload</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="33%">
      <img src="screenshots/teacher-analytics.png" alt="Analytics" width="100%" /><br/>
      <sub><b>Analytics</b> — Student deep-dive with BKT/IRT insights</sub>
    </td>
    <td align="center" width="33%">
      <img src="screenshots/teacher-learning-gaps.png" alt="Learning Gaps" width="100%" /><br/>
      <sub><b>Learning Gaps</b> — Concept-student mastery heatmap</sub>
    </td>
    <td align="center" width="33%">
      <img src="screenshots/teacher-ai-reports.png" alt="AI Reports" width="100%" /><br/>
      <sub><b>AI Reports</b> — Automated report generation</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="33%">
      <img src="screenshots/teacher-students-manage.png" alt="Student Management" width="100%" /><br/>
      <sub><b>Students</b> — Manage class roster & import CSV</sub>
    </td>
    <td align="center" width="33%">
      <img src="screenshots/teacher-student-notifications.png" alt="Notifications" width="100%" /><br/>
      <sub><b>Notifications</b> — Parent communication & alerts</sub>
    </td>
    <td align="center" width="33%">
      <img src="screenshots/teacher-intervention-tracking.png" alt="Interventions" width="100%" /><br/>
      <sub><b>Interventions</b> — Track remediation & progress</sub>
    </td>
  </tr>
</table>

### 🏫 Principal Admin

<table>
  <tr>
    <td align="center" width="33%">
      <img src="screenshots/principal-dashboard.png" alt="Principal Dashboard" width="100%" /><br/>
      <sub><b>Principal Dashboard</b> — School-wide statistics & overview</sub>
    </td>
    <td align="center" width="33%">
      <img src="screenshots/principal-manage-subjects.png" alt="Manage Subjects" width="100%" /><br/>
      <sub><b>Manage Subjects</b> — Configure school subjects</sub>
    </td>
    <td align="center" width="33%">
      <img src="screenshots/principal-manage-teachers.png" alt="Manage Teachers" width="100%" /><br/>
      <sub><b>Manage Teachers</b> — Add/edit/delete teacher accounts</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="33%">
      <img src="screenshots/principal-manage-classes.png" alt="Manage Classes" width="100%" /><br/>
      <sub><b>Manage Classes</b> — Configure classes & sections</sub>
    </td>
    <td align="center" width="33%">
      <img src="screenshots/principal-teacher-assignments.png" alt="Teacher Assignments" width="100%" /><br/>
      <sub><b>Teacher Assignments</b> — Assign teachers to class-subject combos</sub>
    </td>
    <td align="center" width="33%"></td>
  </tr>
</table>

---

## 📋 Problem Statement

Traditional education systems face several critical challenges in the modern classroom:

- **📝 Manual Quiz Creation** — Teachers spend hours hand-crafting quizzes and assessments, taking time away from actual teaching.
- **📄 Tedious Grading** — Grading stacks of answer sheets is time-consuming, error-prone, and delays feedback to students.
- **📊 Limited Visibility** — Teachers lack granular insights into which concepts each student has mastered or is struggling with.
- **⚠️ Late Intervention** — Without early warnings, at-risk students often fall behind before anyone notices.
- **🌐 Language Barriers** — Parent-teacher communication suffers when reports are only available in one language.
- **🎯 One-Size-Fits-All** — Remediation is generic, not personalized to each student's unique knowledge gaps.

---

## 💡 Solution

**ShikshakIQ** (शिक्षक IQ — "Teacher IQ") is a comprehensive AI-powered educational intelligence platform that transforms classroom management through:

| Challenge | ShikshakIQ Solution |
|-----------|-------------------|
| **Quiz Creation** | AI-generated quizzes using Google Gemini — specify class, subject, topic, difficulty & marks |
| **Grading** | AI Vision scans handwritten answer sheets via camera or file upload — auto-grades with feedback |
| **Learning Analytics** | Bayesian Knowledge Tracing (BKT) + Item Response Theory (IRT) for deep learning insights |
| **Early Warnings** | AI identifies at-risk students and suggests targeted interventions before they fall behind |
| **Multilingual** | Reports, feedback, and notifications in **11 Indian languages** |
| **Personalized Learning** | Auto-generated remediation quizzes for each student's weak concepts |
| **Parent Engagement** | Automated progress reports and notifications via email/SMS/WhatsApp |

---

## ✨ Features

### 🤖 AI-Powered Quiz Engine
- Generate complete quizzes with Google Gemini AI in seconds
- Customize by class, subject, topic, difficulty, and marks
- Mix of MCQ, short answer, and descriptive questions
- Topic-aware fallback question bank for offline reliability

### 📸 Answer Sheet Scanning
- **Camera Scan** — Students can photograph handwritten answer sheets
- **File Upload** — Upload PDF or image files for batch processing
- **Gemini Vision** — AI reads handwriting, evaluates answers, and calculates scores
- **Student Matching** — AI identifies the student; teachers confirm before saving

### 📊 Bayesian Knowledge Tracing (BKT)
- Track concept mastery probabilities per student
- Model parameters: P(Known), P(Learn), P(Guess), P(Slip)
- Identify weak concepts before they become critical gaps
- Predict student learning trajectories over time

### 📈 Item Response Theory (IRT)
- Measure **student ability** (theta parameter)
- Assess **question difficulty** and **discrimination power**
- Calibrate guessing parameters for fair assessment
- Identify which questions best distinguish knowledge levels

### 🎯 Learning Gap Analysis
- Interactive concept-student heatmap with mastery colors
- Sortable and searchable grid for rapid gap detection
- AI-suggested interventions with severity ratings
- Critical gap alerts when 50%+ of students struggle on a concept

### 🚨 Early Warning System
- Multi-factor risk prediction combining BKT, IRT, and performance
- Color-coded severity levels (Critical → High → Medium → Low)
- Detailed risk factor breakdown per student
- One-click intervention creation from AI suggestions

### 👨‍🎓 Student Self-Service Portal
- Students log in with their own credentials
- View personalized progress dashboard with score timelines
- Track concept mastery across all subjects
- Auto-generated practice quizzes for weak concepts
- Self-serve remediation generation

### 🌐 11-Language Multilingual Support
| Language | Script | Code |
|----------|--------|------|
| English | Latin | `en` |
| Hindi | हिन्दी | `hi` |
| Telugu | తెలుగు | `te` |
| Tamil | தமிழ் | `ta` |
| Kannada | ಕನ್ನಡ | `kn` |
| Malayalam | മലയാളം | `ml` |
| Marathi | मराठी | `mr` |
| Bengali | বাংলা | `bn` |
| Gujarati | ગુજરાતી | `gu` |
| Punjabi | ਪੰਜਾਬੀ | `pa` |
| Urdu | اردو | `ur` |

### 👩‍🏫 Role-Based Access
- **Principal** — School-wide dashboard, manage teachers/classes/subjects/academic years
- **Teacher** — Class-specific workspaces, quizzes, analytics, interventions
- **Student** — Personal progress tracking, practice quizzes, remediation

### 📧 Parent Notifications
- Configurable notification settings per student (email, SMS, WhatsApp)
- Low-score alerts with customizable thresholds
- Weekly summary reports
- AI-generated multilingual parent messages

### 🏥 Intervention Tracking
- Track remediation, extra practice, tutoring, counseling, parent meetings
- Status workflow: Planned → In Progress → Completed
- Priority levels: Low → Medium → High → Critical
- Measure outcome with before/after scores

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| **React 19** | UI framework with hooks-based architecture |
| **Vite** | Lightning-fast dev server and build tool |
| **Tailwind CSS** | Utility-first styling for modern UI |
| **Framer Motion** | Smooth page transitions and micro-interactions |
| **React Router v7** | Client-side routing with lazy-loaded pages |
| **Recharts** | Interactive charts for analytics dashboards |
| **Three.js / React Three Fiber** | 3D neural network background visuals |
| **i18next** | Full internationalization (11 languages) |
| **Axios** | HTTP client with JWT interceptors |
| **React Icons** | Consistent iconography throughout the UI |

### Backend
| Technology | Purpose |
|-----------|---------|
| **Flask 2.3** | Lightweight Python web framework |
| **SQLAlchemy** | ORM with automatic migrations |
| **Flask-JWT-Extended** | JWT-based authentication with role claims |
| **Flask-CORS** | Cross-origin resource sharing |
| **Gunicorn** | Production WSGI server |
| **PostgreSQL / SQLite** | Production / Local development databases |
| **Pandas & NumPy** | Data processing for analytics |
| **scikit-learn** | ML utilities for educational models |

### AI & ML Models
| Model | Application |
|-------|------------|
| **Google Gemini 2.5 Flash** | Quiz generation, answer sheet analysis, report generation, translation |
| **Bayesian Knowledge Tracing (BKT)** | Concept mastery probability tracking |
| **Item Response Theory (IRT) 3PL** | Student ability estimation, question quality metrics |
| **Key Rotation** | Automatic failover across multiple Gemini API keys |

---

## 🏗️ Architecture

```
shikshak-iq/                    # Frontend (React + Vite)
├── src/
│   ├── components/             # Reusable UI components
│   │   ├── AnimatedCard.jsx    # Glassmorphism cards
│   │   ├── NeuralBackground.jsx # 3D Three.js background
│   │   ├── Navigation.jsx      # Sidebar navigation
│   │   └── WebGLErrorBoundary.jsx
│   ├── context/                # React context providers
│   │   ├── AuthContext.jsx     # Authentication state
│   │   ├── LanguageContext.jsx # i18n language switching
│   │   └── ToastContext.jsx    # Toast notifications
│   ├── pages/                  # Route-level page components
│   │   ├── admin/              # Principal portal pages
│   │   ├── Landing.jsx         # Landing page
│   │   ├── Login.jsx           # Teacher login
│   │   ├── Dashboard.jsx       # Teacher dashboard
│   │   ├── Analytics.jsx       # Analytics with BKT/IRT
│   │   ├── Quizzes.jsx         # Quiz creation & management
│   │   ├── PaperAnalysis.jsx   # Camera/upload scanning
│   │   ├── LearningGaps.jsx    # Concept gap heatmap
│   │   ├── Interventions.jsx   # Intervention tracking
│   │   └── StudentPortal.jsx   # Student self-service
│   ├── services/
│   │   ├── api.js              # Axios API client
│   │   └── useRealtime.js      # Polling hook
│   └── i18n/locales/           # Translation files (11 languages)

backend/                        # Backend (Flask)
├── app.py                      # Flask app factory
├── config.py                   # Configuration (DB, API keys, etc.)
├── models.py                   # SQLAlchemy models (16+ tables)
├── seed.py                     # Comprehensive demo data seeder
├── extensions.py               # Flask extensions (db, jwt, cors)
├── routes/                     # API route blueprints
│   ├── auth_routes.py          # Authentication endpoints
│   ├── admin_routes.py         # Principal admin endpoints
│   ├── student_routes.py       # Student CRUD + CSV import
│   ├── quiz_routes.py          # Quiz CRUD + AI generation
│   ├── analytics_routes.py     # BKT, IRT, dashboards
│   ├── paper_routes.py         # Answer sheet analysis
│   ├── student_portal_routes.py # Student self-service
│   ├── intervention_routes.py  # Intervention tracking
│   └── notification_routes.py  # Parent notifications
├── services/
│   ├── gemini_service.py       # Gemini AI with key rotation
│   ├── education_models.py     # BKT & IRT implementations
│   └── cache.py                # Redis caching layer
└── uploads/                    # Uploaded answer sheets
```

---

## 🚀 Installation & Setup

### Prerequisites
- **Python 3.10+** (with pip)
- **Node.js 20+** (with npm)
- **Google Gemini API Key** (optional — app works with fallback question bank)

### Quick Start (Local Development)

#### 1. Clone the repository
```bash
git clone https://github.com/yourusername/shikshak-iq.git
cd shikshak-iq
```

#### 2. Backend Setup
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

#### 3. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` with your settings:
```env
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here
GEMINI_API_KEY=your-gemini-api-key-here  # Optional
GEMINI_API_KEYS=key1,key2,key3            # Optional: multiple keys for rotation
DATABASE_URL=sqlite:///shikshakiq.db      # Use PostgreSQL in production
```

#### 4. Frontend Setup
```bash
cd ../shikshak-iq
npm install
```

#### 5. Run the Application

**Option A — One command (recommended):**
```bash
# From the project root
python start.py
```

**Option B — Separate terminals:**
```bash
# Terminal 1: Backend
cd backend
python app.py
# → http://localhost:5000

# Terminal 2: Frontend
cd shikshak-iq
npx vite --host
# → http://localhost:5173
```

The app auto-seeds demo data on first run. Open **http://localhost:5173** 🎉

---

## 👤 Demo Accounts

The app seeds with rich demo data automatically. Use these credentials:

### Teacher Accounts
| Email | Password | Specialization |
|-------|----------|---------------|
| `lakshmi@shikshakiq.com` | `Teacher@123` | Mathematics |
| `rajan@shikshakiq.com` | `Teacher@123` | Science |
| `priya@shikshakiq.com` | `Teacher@123` | English |
| `anil@shikshakiq.com` | `Teacher@123` | Social Science |
| `sunita@shikshakiq.com` | `Teacher@123` | Hindi |
| `ravi@shikshakiq.com` | `Teacher@123` | Mathematics |
| `neha@shikshakiq.com` | `Teacher@123` | Science |

### Principal Account
| Email | Password |
|-------|----------|
| `principal@shikshakiq.com` | `Principal@123` |

### Student Portal Accounts
| Username | Password |
|----------|----------|
| `student.aarav` | `student123` |
| `student.ananya` | `student123` |
| `student.arjun` | `student123` |
| `student.kavya` | `student123` |
| `student.rohan` | `student123` |
| `student.saanvi` | `student123` |
| `student.aanya` | `student123` |
| `student.dhruv` | `student123` |
| `student.ishita` | `student123` |
| `student.advik` | `student123` |

> All student accounts use password: `student123`

---

## 🎯 How to Use the Application

### For Teachers

1. **Login** → Navigate to `/login` or click "Teacher Portal" on the landing page
2. **Select Workspace** → Choose your class + subject combination
3. **Dashboard** → View class overview, recent activity, at-risk students
4. **Create Quiz** → Manual creation or AI generation with Gemini
5. **Students** → Manage class roster, import from CSV
6. **Paper Analysis** → Scan/upload answer sheets for auto-grading
7. **Analytics** → Class-level overview or individual student deep dive
8. **Learning Gaps** → Heatmap showing concept mastery across students
9. **Interventions** → Track remediation for at-risk students
10. **Reports** → Generate AI-powered reports in 11 languages

### For Principals

1. **Login** → `principal@shikshakiq.com` / `Principal@123`
2. **Admin Dashboard** → School-wide statistics and overview
3. **Manage Teachers** → Add/edit/delete teacher accounts
4. **Manage Classes** → Configure classes and sections
5. **Manage Subjects** → Define subjects offered by the school
6. **Manage Assignments** → Assign teachers to class-subject combinations
7. **Academic Years** → Manage academic year cycles

### For Students

1. **Access** → Navigate to `/student-portal` from the landing page
2. **Login** → Use student username/password
3. **Dashboard** → View recent results, concept strengths & weaknesses
4. **My Progress** → Score timeline with improvement tracking
5. **My Gaps** → Detailed concept mastery breakdown
6. **Practice Quizzes** → Complete assigned remediation quizzes
7. **Generate Practice** → Auto-create quizzes for weak concepts

---

## 📡 API Overview

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Teacher/Principal login |
| `/api/auth/me` | GET | Current user profile |
| `/api/student/login` | POST | Student portal login |
| `/api/student/me` | GET | Student profile & stats |
| `/api/quizzes` | GET/POST | Quiz CRUD |
| `/api/quizzes/generate-ai` | POST | AI quiz generation |
| `/api/quizzes/{id}/submit` | POST | Submit quiz answers |
| `/api/students` | GET/POST | Student CRUD |
| `/api/analytics/class` | GET | Class analytics with BKT/IRT |
| `/api/analytics/student/{id}` | GET | Student deep dive |
| `/api/analytics/early-warnings` | GET | At-risk student detection |
| `/api/paper/analyze` | POST | Analyze answer sheet |
| `/api/reports/generate` | POST | AI report generation |
| `/api/interventions` | GET/POST | Intervention CRUD |
| `/api/interventions/suggestions` | GET | AI intervention suggestions |
| `/api/notifications/send` | POST | Send parent notification |
| `/api/admin/teachers` | GET/POST | Admin teacher management |
| `/api/health` | GET | Health check |

---

## 📁 Project Structure

```
C:\ShikShak IQ/
├── README.md                    # ← You are here
├── start.py                     # One-command launcher
├── requirements.txt             # Root requirements
├── vercel.json                  # Vercel deployment configuration
│
├── backend/                     # Flask API server
│   ├── app.py                   # Application factory
│   ├── config.py                # Configuration & env vars
│   ├── models.py                # 16 SQLAlchemy models
│   ├── seed.py                  # Demo data seeder
│   ├── extensions.py            # Flask extensions
│   ├── wsgi.py                  # WSGI entry point
│   ├── requirements.txt         # Python dependencies
│   ├── routes/                  # API route blueprints
│   └── services/                # Business logic & AI
│
├── shikshak-iq/                 # React frontend
│   ├── package.json             # Node dependencies
│   ├── vite.config.js           # Vite config with API proxy
│   ├── tailwind.config.js       # Tailwind CSS config
│   ├── index.html               # HTML entry point
│   └── src/                     # Source code
│       ├── main.jsx             # React entry
│       ├── App.jsx              # Root with routing
│       ├── index.css            # Global styles
│       ├── components/          # Reusable components
│       ├── context/             # State management
│       ├── pages/               # Route pages
│       ├── services/            # API client & hooks
│       └── i18n/               # Internationalization
│
└── api/                         # Serverless entry for Vercel
    └── index.py
```

---

## 🧪 Demo Data

The seed script (`backend/seed.py`) creates a comprehensive demo environment:

- **1 School** — Shikshak International School
- **1 Principal** — Full admin access
- **7 Teachers** — With subject specializations
- **10 Classes** — 6A through 10B (5 per grade × 2 sections)
- **6 Subjects** — Mathematics, Science, English, Social Science, Hindi, Sanskrit
- **50 Students** — 5 per class, each with parent details
- **50+ Sample Quizzes** — Distributed across teachers and classes
- **100+ Concept Masteries** — With BKT tracking data
- **5 Demo Interventions** — Pre-configured for demonstration
- **3 Remediation Quizzes** — Linked to interventions
- **15 Notification Records** — History for parent communication
- **10 Student Portal Accounts** — Active student logins

---

## 🚀 Deployment

### Vercel (Frontend + Serverless API)

The project includes a `vercel.json` that configures:
- Build: `cd shikshak-iq && npm install && npm run build`
- Output: `shikshak-iq/dist`
- Routes: All `/api/*` requests to `api/index.py`
- Fallback: All other routes serve `index.html` (SPA)

```bash
# Deploy to Vercel
vercel --prod
```

### Production Database

For production, set `DATABASE_URL` to a PostgreSQL connection string:
```
postgresql://user:pass@host:5432/shikshakiq?sslmode=require
```

The app automatically enables connection pooling for PostgreSQL.

---

## 📊 Educational Models Explained

### Bayesian Knowledge Tracing (BKT)

BKT models each student's knowledge of a concept as a hidden binary state (known/not known) with four parameters:

- **P(K₀)** — Probability the student already knows the concept
- **P(Learn)** — Probability of learning after each practice opportunity
- **P(Guess)** — Probability of guessing correctly when unknown
- **P(Slip)** — Probability of making a mistake when known

These parameters update dynamically as students answer quiz questions, providing real-time mastery tracking.

### Item Response Theory (IRT) — 3PL Model

IRT models the relationship between a student's ability and their probability of answering a question correctly:

- **θ (Theta)** — Student ability parameter
- **a (Discrimination)** — How well the question distinguishes high vs low ability students
- **b (Difficulty)** — The ability level at which 50% of students answer correctly
- **c (Guessing)** — Lower asymptote representing chance-level success

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines
- Follow existing code style and conventions
- Add tests for new features
- Update documentation as needed
- Ensure the seed script runs without errors

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Google Gemini** — For powering AI quiz generation, vision analysis, and translation
- **React, Flask, Tailwind** — For the amazing open-source frameworks
- **Framer Motion** — For beautiful animations
- **Three.js** — For the immersive 3D neural network background

---

<p align="center">
  <sub>शिक्षक IQ — Empowering Teachers, Enlightening Minds</sub>
</p>
=======
# ShikshakIQ
>>>>>>> 06f0e61492b2f201abe7e713e55f81d9f21b33b0
