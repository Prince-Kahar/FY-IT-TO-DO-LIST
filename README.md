# FY IT Task Manager 🎓

**A Complete Academic Task Management, Photo Proof Submission & Grading Portal for FY B.Sc. IT Students and Faculty.**

---

## 📌 Overview

**FY IT Task Manager** is a production-ready, full-stack academic web application designed specifically for First Year Bachelor of Science in Information Technology (FY B.Sc. IT) students and faculty/class coordinators.

### Core Problems Solved:
1. **Daily Academic Accountability:** Students record and complete subject-wise practicals, journal write-ups, revision notes, and homework.
2. **Handwritten Proof Uploads:** Students upload multiple high-resolution photos of handwritten journal pages, code outputs, and dry-run traces directly to secure, private Supabase Storage.
3. **Faculty Control & Dynamic Curriculum:** The Class Head / Admin manages subjects (e.g., C Programming, DBMS, Data Structures, Discrete Mathematics) and topics dynamically without altering source code.
4. **Grading & Correction Loop:** Faculty can inspect photos in a high-resolution lightbox, approve or request corrections, award marks, provide qualitative feedback, and track on-time vs late submissions.
5. **In-App Alerts & Reporting:** Students receive instant notifications upon assignment or review. Faculty can export comprehensive class performance reports to CSV.

---

## 🛠️ Technology Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | React 18 + Vite | Fast, responsive Single Page Application with clean component architecture |
| **Icons** | Lucide React | High-legibility academic UI icons |
| **Styling** | Modern Vanilla CSS | Curated HSL color palette (Indigo primary, Teal secondary, semantic status colors) |
| **Database** | Supabase PostgreSQL | Relational schema with foreign keys, constraints, and update triggers |
| **Authentication** | Supabase Auth | Secure email and password authentication with persistent sessions |
| **File Storage** | Supabase Storage | Private bucket `task-submissions` with strict RLS policies and signed URLs |
| **Authorization** | Row Level Security (RLS) | Database-enforced isolation ensuring students cannot access other students' private files |
| **Deployment** | Vercel / Netlify | Compatible with any modern static web host |

---

## 📁 Repository Structure

```text
├── .env.example                     # Environment template for Supabase URL and Anon key
├── index.html                       # HTML5 entry with Outfit & Inter typography
├── package.json                     # Dependencies (@supabase/supabase-js, react-router-dom, lucide-react)
├── vite.config.js                   # Vite bundler configuration
│
├── supabase/
│   ├── schema.sql                   # Complete PostgreSQL schema, tables, triggers, and RLS policies
│   ├── storage.sql                  # Private storage bucket 'task-submissions' & Storage RLS policies
│   ├── seed.sql                     # Initial seed data (Subjects, Topics, Welcome Announcement)
│   └── admin_provisioning.sql       # Secure Admin promotion and creation SQL scripts
│
└── src/
    ├── main.jsx                     # React DOM root entry
    ├── App.jsx                      # App router with protected routes
    ├── index.css                    # Unified academic design system and responsive layout
    │
    ├── context/
    │   ├── AuthContext.jsx          # Auth provider handling user sessions, roles, and profiles
    │   └── ToastContext.jsx         # Toast notification system with celebration confetti
    │
    ├── lib/
    │   ├── supabaseClient.js        # Supabase client initialization & photo upload storage helpers
    │   ├── dataService.js           # Unified service layer communicating with Supabase PostgreSQL
    │   └── mockData.js              # Evaluation test data for instant preview mode
    │
    ├── components/
    │   ├── Layout.jsx               # App shell containing Sidebar, Navbar, and DemoBanner
    │   ├── Sidebar.jsx              # Responsive role-based navigation sidebar & drawer
    │   ├── Navbar.jsx               # Top bar with role badge and unread notifications count
    │   ├── StatusBadge.jsx          # Semantic badges (Assigned, In Progress, Submitted, Approved, Overdue, etc.)
    │   ├── PhotoViewerModal.jsx     # High-resolution image lightbox with zoom and navigation controls
    │   ├── SubmitWorkModal.jsx      # Multi-photo upload modal with client validation and dropzone
    │   ├── ReviewModal.jsx          # Admin grading modal (approve, correction, marks, feedback)
    │   ├── TaskModal.jsx            # Dynamic task creation and editing modal
    │   ├── SubjectModal.jsx         # Subject creation and editing modal
    │   ├── TopicModal.jsx           # Topic creation modal under any subject
    │   ├── AnnouncementModal.jsx    # Class notice broadcast modal
    │   ├── DemoBanner.jsx           # 1-click role switcher banner in evaluation mode
    │   └── ProtectedRoute.jsx       # Route guard enforcing student and admin role access
    │
    └── pages/
        ├── auth/
        │   ├── Login.jsx            # Student & Admin login with quick demo filler
        │   ├── Register.jsx         # Student registration (Roll number, Class, Division)
        │   └── ForgotPassword.jsx   # Password reset request screen
        │
        ├── student/
        │   ├── StudentDashboard.jsx # KPI cards, overall progress bar, upcoming deadlines, subject progress
        │   ├── StudentTasks.jsx     # Academic task list with filter tabs, search, and submission triggers
        │   ├── StudentSubjects.jsx  # Curriculum syllabus explorer with topic breakdown
        │   ├── StudentSubmissions.jsx # History of submitted work, attempt numbers, and teacher feedback
        │   ├── StudentNotifications.jsx # Alerts for new tasks, reviews, and deadlines
        │   └── StudentProfile.jsx   # Academic profile info, division, and password update
        │
        ├── admin/
        │   ├── AdminDashboard.jsx   # Class KPIs, submissions awaiting review, quick actions
        │   ├── AdminTasks.jsx       # Academic task management, filter by subject/type, edit, delete
        │   ├── AdminSubmissions.jsx # Review hub, filter by status/on-time, CSV report export
        │   ├── AdminSubjects.jsx    # Dynamic subject & topic curriculum management
        │   ├── AdminStudents.jsx    # Student roster, account activation/deactivation, drill-down profile
        │   ├── AdminReports.jsx     # Class completion analytics & master CSV export
        │   └── AdminAnnouncements.jsx # Class announcement broadcaster
        │
        └── NotFound.jsx             # 404 & Unauthorized route screen
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** or **pnpm**
- A free **Supabase** account at [supabase.com](https://supabase.com)

### 2. Installation
Clone or navigate to the project directory:
```bash
cd "c:/Users/Admin/Desktop/FY TO DO LIST"
npm install
```

### 3. Supabase Database & Storage Setup

1. Open your project on [Supabase Dashboard](https://supabase.com/dashboard).
2. Navigate to **SQL Editor** in the left sidebar.
3. Open `supabase/schema.sql` from this project, paste the content into SQL Editor, and click **RUN**.
   - This creates all 9 relational tables (`profiles`, `subjects`, `topics`, `tasks`, `task_assignments`, `submissions`, `submission_files`, `announcements`, `notifications`).
   - Enables Row Level Security (RLS) on all tables with strict access policies.
   - Installs automated triggers for new user registration and timestamp updates.
4. Open `supabase/storage.sql`, paste into SQL Editor, and click **RUN**.
   - Creates the private storage bucket `task-submissions` (5MB limit, JPG/PNG/WEBP allowed).
   - Establishes storage RLS policies restricting file access to authorized students and admins.
5. (Optional but recommended) Run `supabase/seed.sql` to populate initial FY B.Sc. IT subjects and curriculum topics.

### 4. Admin Account Provisioning
1. Register a new user account through the web app (e.g. `admin@college.edu`).
2. Run the SQL script from `supabase/admin_provisioning.sql`:
   ```sql
   UPDATE public.profiles
   SET role = 'admin', full_name = 'Class Coordinator / Admin'
   WHERE email = 'admin@college.edu';
   ```
3. That user is now recognized as Class Head / Admin and can access `/admin`.

### 5. Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Open `.env` and fill in your Supabase credentials found in **Supabase Dashboard -> Project Settings -> API**:
```ini
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 6. Run Locally
```bash
npm run dev
```
Open your browser at `http://localhost:5174/` or the port displayed in your terminal.

---

## 🔒 Security Architecture

1. **Client Isolation:** The Supabase client only uses the public anonymous key (`VITE_SUPABASE_ANON_KEY`). The sensitive `SERVICE_ROLE_KEY` is **never** embedded or exposed in frontend code.
2. **Row Level Security (RLS):**
   - Students can only view their own profile, assignments, submissions, and private uploaded files.
   - Students cannot self-elevate their role to `admin`.
   - Admin actions require verification through the PostgreSQL security definer function `public.is_admin()`.
3. **Private File Storage:**
   - The bucket `task-submissions` is strictly private (`public = false`).
   - Photos are retrieved using time-limited signed URLs (`createSignedUrl`) generated only for authorized users.
   - Path structure: `<student_id>/<task_assignment_id>/<submission_id>/<unique_filename>`.

---

## 🧪 Comprehensive Verification Checklist

| Feature | Test Case | Status |
|---|---|---|
| **Student Registration** | Register with Full Name, Roll No, Division, Email, Password | ✅ Verified |
| **Authentication Guard** | Protected routes redirect unauthenticated users to `/login` | ✅ Verified |
| **Role Authorization** | Students cannot access `/admin/*` routes (redirected to dashboard) | ✅ Verified |
| **Student Dashboard** | Displays real KPIs, overall progress percentage, upcoming deadlines | ✅ Verified |
| **Task Filtering** | Filter by All, Pending, Submitted, Approved, Overdue, and Subjects | ✅ Verified |
| **Submit Work Modal** | Multi-photo upload dropzone with 5MB limit, JPG/PNG/WEBP validation | ✅ Verified |
| **Photo Proof Storage** | Files uploaded to `task-submissions` private bucket with unique paths | ✅ Verified |
| **Submission Workflow** | Updates status to `Submitted`, marks late if submitted after deadline | ✅ Verified |
| **Admin Dashboard** | Real-time counts of students, published tasks, awaiting review, late tasks | ✅ Verified |
| **Admin Review Modal** | Open high-res photo lightbox, approve/needs correction, marks & feedback | ✅ Verified |
| **Resubmission Loop** | Students can resubmit when status is "Needs Correction" | ✅ Verified |
| **Curriculum Control** | Admin can dynamically create subjects and topics without code changes | ✅ Verified |
| **Student Directory** | Admin can toggle student active/inactive status and inspect drilldown | ✅ Verified |
| **CSV Export** | Exports filtered student submissions and master progress report to CSV | ✅ Verified |
| **Responsive Design** | Full desktop sidebar and responsive mobile slide-out navigation | ✅ Verified |

---

## 🚢 Deployment Guide (Vercel)

1. Push your repository to GitHub / GitLab / Bitbucket:
   ```bash
   git init
   git add .
   git commit -m "feat: complete FY IT Task Manager application"
   git branch -M main
   git remote add origin https://github.com/your-username/fy-it-task-manager.git
   git push -u origin main
   ```
2. Log in to [Vercel](https://vercel.com) and click **"Add New..." -> "Project"**.
3. Import your repository.
4. In **Build and Output Settings**:
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. In **Environment Variables**, add:
   - `VITE_SUPABASE_URL` = your Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase Anon Public Key
6. Click **Deploy**. Vercel will build and deploy your application in under a minute with HTTPS and continuous deployment!

---

## 📄 License
Created for FY B.Sc. IT students and academic departments. Released under the MIT License.
