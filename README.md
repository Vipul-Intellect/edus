# 🎓 EduSync — Intelligent Timetable Management System

> A production-ready, multi-tenant, full-stack academic scheduling platform with AI chatbot, Google Calendar integration, real-time notifications, automated timetable generation via constraint solving, and cross-platform mobile support.

---

## 🚀 Live Deployment

**Production URL:** [https://edu-77160732294.asia-south1.run.app](https://edu-77160732294.asia-south1.run.app)  
*Deployed securely via Google Cloud Run (GCP) backed by a managed PostgreSQL database.*

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [Core Features (Working)](#-core-features-working)
- [Database Models](#-database-models)
- [Complete API Reference](#-complete-api-reference)
- [User Roles & Permissions](#-user-roles--permissions)
- [Multi-Tenancy Design](#-multi-tenancy-design)
- [Security](#-security)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Deployment](#-deployment)
- [Default Credentials](#-default-credentials)

---

## 🌟 Overview

**EduSync** is an enterprise-grade, multi-tenant timetable management system designed for educational institutions. Built as a true SaaS platform, it supports multiple colleges as fully isolated tenants. Each tenant gets independent data, custom feature flags (AI chatbot, meetings, timetable access), and dedicated administrators.

Key engineering highlights:
- **Constraint-based timetable generation** using Google OR-Tools
- **JWT multi-tenant authentication** — college code + credentials scoped login
- **Auto-migrating password security** — plain-text passwords are transparently upgraded to `pbkdf2:sha256` on login
- **Google Calendar bidirectional sync** — timetable changes are pushed live to connected users' calendars
- **Background scheduler** — APScheduler runs calendar sync every 6 hours automatically
- **Encrypted OAuth token storage** — Google tokens encrypted at rest with Fernet symmetric encryption
- **Excel & CSV bulk import** with row-level failure diagnostics

---

## 🛠 Tech Stack

### Backend
| Technology | Role |
|---|---|
| **Python 3.12 / Flask** | REST API server — Application Factory pattern |
| **SQLAlchemy (ORM)** | Database access layer with multi-tenant query filtering |
| **SQLite** (dev) / **PostgreSQL** (prod) | Relational database |
| **JWT — PyJWT** | Stateless authentication with `college_id` embedded in token |
| **Werkzeug** | Password hashing (`pbkdf2:sha256`, `scrypt`, `bcrypt`) |
| **Google Calendar API** | Bidirectional event sync + Google Meet link generation |
| **APScheduler** | Background calendar sync every 6 hours |
| **Flask-Mail + Gmail SMTP** | Transactional email notifications |
| **Google OR-Tools** | Constraint-programming timetable solver |
| **Pandas + openpyxl** | Excel (`.xlsx`/`.xls`) and CSV bulk import |
| **Cryptography (Fernet)** | AES-128 encryption for stored OAuth tokens |
| **Gunicorn** | Production WSGI server |
| **Flask-CORS** | Cross-Origin Resource Sharing |

### Frontend (Web)
| Technology | Role |
|---|---|
| **React 18 + Vite 7** | SPA framework + build tool |
| **React Router v7** | Client-side routing |
| **Tailwind CSS v4** | Utility-first styling |
| **Radix UI** | Accessible headless components (Dialog, Select, Tabs, Tooltip…) |
| **Lucide React** | Icon library |
| **date-fns** | Date formatting and arithmetic |

### Mobile
| Technology | Role |
|---|---|
| **React Native 0.81 + Expo 54** | Cross-platform mobile (iOS & Android) |
| **React Navigation v7** | Stack + native navigation |
| **AsyncStorage** | JWT token persistence on device |

---

## 🏗 System Architecture

```
timetable-project/
│
├── backend/                    # Flask REST API
│   ├── app.py                  # Application factory, blueprint registration
│   ├── config.py               # Dev/Prod/Test configuration
│   ├── extensions.py           # Flask extensions (DB, CORS, Mail, Scheduler)
│   ├── models/                 # 28 SQLAlchemy models
│   ├── routes/                 # 20 Flask Blueprints (API endpoints)
│   ├── services/               # Business logic layer
│   │   ├── google_calendar_service.py  # OAuth + GCal bidirectional sync
│   │   ├── scheduler_service.py        # OR-Tools timetable generator
│   │   └── email_service.py            # Email dispatch
│   └── utils/
│       ├── tenant_middleware.py  # Extracts college_id from JWT → g.college_id
│       ├── query_filter.py       # Auto-appends WHERE college_id scoping
│       ├── decorators.py         # @token_required, @admin_required, @teacher_required
│       ├── chatbot_utils.py      # Intent detection + chatbot query handlers
│       └── export_utils.py       # CSV export of DB state
│
├── frontend/                   # React + Vite SPA
│   └── src/
│       ├── App.jsx             # Routes + Auth guard
│       ├── api.jsx             # Centralized Axios API service (21KB)
│       ├── pages/              # Role-based page views
│       ├── components/         # Reusable UI components
│       └── hooks/              # Custom React hooks
│
└── mobile/                     # React Native + Expo
    └── src/
        ├── screens/            # Teacher, Student, Admin, Auth screens
        ├── navigation/         # Stack navigators
        ├── services/           # API service layer
        └── context/            # Auth context provider
```

### Multi-tenant Request Flow

```
Client Request
    │
    ▼
JWT Token → tenant_middleware.py
    │  Extracts: user_id, college_id, role
    │  Sets: g.college_id, g.is_super_admin
    ▼
query_filter.py (SQLAlchemy event hook)
    │  Auto-injects: WHERE college_id = g.college_id
    │  on every Model.query.* call
    ▼
Route Handler → Response
```

---

## ✨ Core Features (Working)

### 🏫 Multi-Tenant SaaS Platform
- **SuperAdmin** creates colleges with a unique `college_code` (e.g., `IITB`, `MIT`)
- Each college gets a dedicated admin account auto-created on provisioning
- Feature flags per college: `ai_chatbot`, `meetings`, `timetable` — toggle via PATCH API
- Subscription tiers: `free`, `basic`, `enterprise`
- College active/inactive toggle — inactive colleges block all logins
- Complete data isolation — `college_id` scoping on every single DB query

### 📅 Automated Timetable Generation (OR-Tools)
- Google OR-Tools constraint solver generates conflict-free timetables
- Constraints enforced: faculty availability, room capacity, section hours/day, fixed slots
- Support for **fixed courses** (`is_fixed`, `fixed_day`, `fixed_slot`, `fixed_room_id`)
- Mark faculty as unavailable for specific day/time slots before generation
- Regenerate anytime — previous timetable is replaced
- Export timetable to CSV
- Filter timetable by `dept_name`, `year`, `section`
- Swap history tracked: each entry records `is_swapped`, `swapped_at`, `swapped_by`, `swap_group_id`, `swapped_with_course`

### 🔄 Hybrid Class Swap System
- **Teacher** submits a swap request: original class + proposed new day/time + reason
- **Admin** reviews, approves, or rejects with notes
- On approval with a conflict: detects if both entries share the same faculty or section — performs a **transactional double-move** (swap pair atomically)
- `force_swap` flag: admin can force a swap even when a conflict is detected
- Secondary conflict validation — ensures the conflicting class can also move before committing
- Swap group UUID links the two exchanged classes together
- Admin can **bulk approve/reject** leave requests

### 👩‍🏫 Faculty Management
- CRUD for faculty members (name, department, max hours, email, subject)
- **Bulk import** from CSV/Excel (`faculty_name`, `dept_name`, `username`, `password`, `email`, `max_hours`)
- Faculty unavailability slots: block specific day + start time combinations
- **Workload tracking per week**: teaching hours (from timetable) + meeting hours
- Workload status: `normal`, `overloaded`, `underloaded` with configurable thresholds
- Admin workload overview — all faculty for current week
- Workload alerts — lists overloaded and underloaded faculty

### 🧑‍🎓 Student Management
- CRUD for student users with department, year, section assignment
- **Bulk import from CSV or Excel** (`.xlsx`/`.xls`) with row-level error reporting
  - Excel numeric columns auto-fixed (e.g., `123456.0` → `123456`)
  - Column header whitespace stripped
  - Skip reasons reported per row (up to 20 diagnostics)
- **Bulk delete** students by ID list
- Student attendance auto-calculated as overall percentage
- Roll number tracking

### ✅ Attendance System
- Teacher marks attendance per session: `present`, `absent`, `late`
- Optional course and date filtering
- Upsert logic — updating existing records for the same student/course/date
- Student overall attendance percentage auto-recalculated after every mark
- Teacher can **view attendance** for a given date/section/course combination
- Students view their own attendance record through student dashboard

### 📊 Assessment & Grading
- Teachers create assessments: `quiz`, `midterm`, `final`, `assignment`, etc.
- Assessment fields: title, max marks, weightage, scheduled date/time, duration, location
- Update/delete assessments (only by creator or admin)
- Teachers enter grades per student per assessment (JSON or CSV upload)
- Grade auto-calculates: percentage and letter grade (`A`, `B`, `C`, `D`, `F`)
- Students view all their marks with course, assessment, percentage, grade letter
- Student performance model tracks per-course metrics: attendance %, average grade %, `at_risk` flag
- Admin analytics: total at-risk students, system-wide attendance/performance averages

### 📝 Assignment System
- Teachers create assignments targeting: `course`, `department`, `section`, or `all`
- Optional **file attachment** (PDF, DOCX, XLSX, PNG, JPG, JPEG — max 5 MB)
- Files stored server-side and served at `/api/uploads/<filename>`
- Students see assignments relevant to their section/department/course
- Teachers view all their own assignments
- Due date tracking

### 🤖 AI Chatbot Assistant
- Gated by `ai_chatbot` feature flag per college
- **Intent detection** from natural language queries on 8 intents:
  - `timetable` — user's personal timetable
  - `next_class` — next upcoming class
  - `free_rooms` — currently available rooms
  - `faculty_load` — teacher workload summary (teachers/admins only)
  - `room_utilization` — room usage stats (admin only)
  - `leave_status` — personal leave request status
  - `announcements` — active system announcements
  - `swap_request` — pending swap requests
  - `help` — command listing
- Conversation history stored per user (last 50 entries)
- Clear history endpoint
- Role-aware responses — admin gets extra commands

### 📆 Google Calendar Integration
- OAuth 2.0 flow: `/api/auth/google/url` + `/api/auth/google/callback`
- Tokens encrypted at rest with Fernet before DB storage
- On callback: **initial full timetable sync** triggered immediately
- Timetable update/delete hooks in `timetable_routes.py` → push changes to GCal events in real time
- Background APScheduler: sync all connected users every **6 hours**
- Manual sync endpoint: `POST /api/calendar/sync`
- Disconnect endpoint: removes stored tokens
- Status endpoint reports: `is_connected`, `last_sync_at`, `sync_status`, `last_error`
- Connection loss detection — if sync failed with `access revoked`, reports `is_connected: false`
- **Google Meet link generation** when creating meetings (if Google is connected)

### 🔔 Notifications System
- In-app notification storage per user (last 50 shown)
- Mark single notification as read (`PUT /api/notifications/<id>/read`)
- Mark all as read (`PUT /api/notifications/read-all`)
- Clear all notifications (`DELETE /api/notifications`)
- User notification **preferences**:
  - Toggle: `email_enabled`, `app_enabled`
  - Category toggles: `system_alerts`, `academic_updates`, `resource_updates`
- **Admin/Teacher send notification** with targeting:
  - Target audience: `all`, `role`, `user`, `department`, `section`
- **Send notification with file attachment** (`multipart/form-data`, 5 MB limit)
- File attachments served at `/api/uploads/<filename>`
- Meeting creation auto-notifies all target users

### 📢 System Announcements
- Admin creates announcements with title, message, priority, target roles, optional expiry
- Announcements filtered by: `is_active`, `target_roles`, `expires_at`
- Visible in AI chatbot `announcements` intent
- Listed via `GET /api/chat/announcements`

### 🏢 Room Management
- CRUD for classrooms (name, capacity, resources string)
- **Bulk import** from CSV/Excel
- **Real-time room occupancy** — teachers mark rooms as `free` or `occupied`
- Room status dashboard: `free_rooms`, `occupied_rooms`, `unmarked_rooms`
- Room booking system for resources

### 📱 Mobile App (React Native/Expo)

**Teacher screens:**
- `TeacherDashboard.js` — stats and overview
- `TeacherTimetable.js` — personal timetable view
- `MarkAttendance.js` — mark attendance per session
- `SwapRequests.js` — view/submit swap requests
- `RoomStatus.js` — real-time room occupancy

**Student screens:**
- `StudentDashboard.js` — student home
- `StudentTimetable.js` — section timetable
- `StudentAttendance.js` — attendance record

**Auth + Leave screens** included in `auth/` and `leave/` directories.

### 🔑 Authentication System
- **Multi-portal login**: requires `college_code` + `username` + `password`
- College code validated first → user looked up **within that college** (no cross-college collisions)
- College `is_active` check blocks login to suspended tenants
- **Auto-migration**: plain-text passwords transparently hashed on successful login
- JWT token lifetime: **24 hours**
- JWT payload: `user_id`, `college_id`, `college_code`, `username`, `role`, `exp`
- Separate `POST /api/login` for students/teachers and `POST /api/admin/login` (Admin/SuperAdmin only)
- One-time setup endpoint `POST /api/setup/admin` (disabled via env var after first use)
- User migration endpoint `POST /api/setup/migrate_users`

---

## 🗄 Database Models

| Model | Key Fields |
|---|---|
| `College` | `name`, `college_code`, `feature_flags` (JSON), `subscription_tier`, `is_active` |
| `User` | `username`, `password_hash`, `role`, `college_id`, `dept_id`, `section_id`, `year`, `roll_number`, `attendance` |
| `Department` | `dept_name`, `college_id` |
| `Section` | `name`, `year`, `dept_id`, `max_hours_per_day` |
| `Faculty` | `faculty_name`, `dept_id`, `max_hours`, `email`, `subject`, `is_active`, `weekly_max_hours` |
| `Course` | `name`, `type`, `credits`, `hours_per_week`, `dept_id`, `faculty_id`, `year`, `semester`, `is_fixed`, `fixed_day`, `fixed_slot`, `fixed_room_id` |
| `CourseAllocation` | `course_id`, `faculty_id`, `section_id` |
| `Classroom` | `name`, `capacity`, `resources` |
| `Timetable` | `course_id`, `faculty_id`, `room_id`, `section_id`, `day`, `start_time`, `end_time`, `is_swapped`, `swapped_at`, `swapped_by_id`, `swap_group_id`, `swapped_with_course` |
| `SwapRequest` | `requesting_faculty_id`, `original_timetable_id`, `proposed_day`, `proposed_start_time`, `reason`, `status`, `admin_notes` |
| `FacultyUnavailability` | `faculty_id`, `day`, `start_time` |
| `FacultyWorkload` | `faculty_id`, `week_number`, `year`, `total_teaching_hours`, `total_meeting_hours`, `total_hours`, `max_hours_allowed`, `workload_percentage`, `status` |
| `Attendance` | `student_id`, `course_id`, `date`, `status` (`present`/`absent`/`late`), `marked_by`, `notes` |
| `Assessment` | `course_id`, `title`, `assessment_type`, `max_marks`, `weightage`, `scheduled_date`, `scheduled_time`, `duration_minutes`, `location`, `status`, `created_by` |
| `Grade` | `student_id`, `assessment_id`, `marks_obtained`, `percentage`, `grade_letter`, `remarks`, `graded_by` |
| `Assignment` | `title`, `description`, `file_url`, `file_name`, `file_type`, `target_audience`, `course_id`, `dept_id`, `section_id`, `due_date`, `created_by` |
| `StudentPerformance` | `student_id`, `course_id`, `total_attendance_percentage`, `average_percentage`, `at_risk`, `year` |
| `Meeting` | `title`, `description`, `organizer_id`, `start_datetime`, `end_datetime`, `meeting_link`, `audience_role`, `dept_id`, `year`, `section_id`, `status`, `duration_hours` |
| `LeaveRequest` | `user_id`, `leave_type`, `start_date`, `end_date`, `reason`, `status`, `admin_notes`, `approved_by` |
| `Notification` | `user_id`, `title`, `message`, `category`, `notification_type`, `is_read`, `link`, `file_url`, `file_name`, `file_type`, `sender_name` |
| `NotificationPreference` | `user_id`, `email_enabled`, `app_enabled`, `system_alerts`, `academic_updates`, `resource_updates` |
| `SystemAnnouncement` | `title`, `message`, `priority`, `target_roles`, `created_by`, `expires_at`, `is_active` |
| `RoomOccupancy` | `room_id`, `user_id`, `status` (`free`/`occupied`), `notes`, `timestamp` |
| `UserGoogleAuth` | `user_id`, `encrypted_access_token`, `encrypted_refresh_token`, `sync_status`, `last_sync_at`, `last_error` |
| `CalendarEventMap` | `timetable_id`, `user_id`, `gcal_event_id` |
| `ChatbotConversation` | `user_id`, `query`, `response`, `intent`, `response_type`, `timestamp` |
| `Resource` | bookable resources (projectors, labs, equipment) |
| `Booking` | resource booking records |

---

## 📡 Complete API Reference

> All protected endpoints require `Authorization: Bearer <token>` header.  
> Prefix notation: `[ADMIN]` = admin only, `[TEACHER]` = teacher only, `[STUDENT]` = student only, `[SUPER]` = superadmin only.

---

### 🔐 Authentication — `/api`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/login` | Login for all roles. Body: `{college_code, username, password}` → returns JWT |
| `POST` | `/api/admin/login` | Strict admin/superadmin login. Same body. |
| `POST` | `/api/register` | Register new user. Body: `{college_code, username, password, email, role, dept_id?, year?}` |
| `POST` | `/api/setup/admin` | [Setup] One-time default admin seed (requires `SETUP_SECRET` env var) |
| `POST` | `/api/setup/migrate_users` | [Setup] Migrate users from exported data (requires `SETUP_SECRET`) |

---

### 🏛 Super Admin — `/api/super`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/super/colleges` | `[SUPER]` List all colleges with feature flags |
| `POST` | `/api/super/colleges` | `[SUPER]` Create college + auto-provision admin account. Body: `{name, college_code, admin_email, admin_username?, admin_password?, feature_flags?, subscription_tier?}` |
| `PATCH` | `/api/super/colleges/<college_id>` | `[SUPER]` Update college name, active status, feature flags, subscription tier |
| `GET` | `/api/super/stats` | `[SUPER]` Platform stats: total colleges, total users, platform health |

---

### 👤 Admin — `/admin`

#### Users
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/users` | `[ADMIN]` List all users in college |
| `PUT` | `/admin/users/<user_id>` | `[ADMIN]` Update user (full_name, email, role, is_active, dept_name, password) |
| `DELETE` | `/admin/users/<user_id>` | `[ADMIN]` Delete user |
| `POST` | `/admin/users/register` | `[ADMIN]` Register user with full profile (student/teacher auto-creates faculty record) |
| `GET` | `/admin/stats` | `[ADMIN]` Stats: total_users, pending_leaves, pending_swaps |

#### Departments
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/departments` | `[ADMIN]` List all departments |
| `POST` | `/admin/departments` | `[ADMIN]` Add department. Body: `{dept_name}` |

#### Faculty
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/faculty` | `[ADMIN]` List all faculty (name, dept, max_hours, email, subject) |
| `POST` | `/admin/faculty` | `[ADMIN]` Add faculty. Body: `{faculty_name, dept_name, max_hours?, email?, subject?}` |
| `PUT` | `/admin/faculty/<faculty_id>` | `[ADMIN]` Update faculty member |
| `DELETE` | `/admin/faculty/<faculty_id>` | `[ADMIN]` Delete faculty member |
| `GET` | `/admin/faculty/<faculty_id>/unavailability` | `[ADMIN]` Get unavailability slots |
| `POST` | `/admin/faculty/<faculty_id>/unavailability` | `[ADMIN]` Add blocked slot. Body: `{day, start_time}` |
| `DELETE` | `/admin/unavailability/<slot_id>` | `[ADMIN]` Remove blocked slot |

#### Students
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/students` | `[ADMIN]` List all students |
| `POST` | `/admin/students` | `[ADMIN]` Add student. Body: `{username, full_name, dept_name, year, password, email?, section_name?}` |
| `GET` | `/admin/students/<student_id>` | `[ADMIN]` Get student details |
| `PUT` | `/admin/students/<student_id>` | `[ADMIN]` Update student (username, dept, year, section, password) |
| `DELETE` | `/admin/students/<student_id>` | `[ADMIN]` Delete student |
| `POST` | `/admin/students/delete_bulk` | `[ADMIN]` Bulk delete students. Body: `{student_ids: [int, ...]}` |

#### Courses
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/courses` | `[ADMIN]` List all courses with full details |
| `POST` | `/admin/courses` | `[ADMIN]` Create course. Body: `{name, type, dept_name, year, semester, credits?, hours_per_week?, faculty_id?, is_fixed?, fixed_day?, fixed_slot?, fixed_room_id?}` |
| `PUT` | `/admin/courses/<course_id>` | `[ADMIN]` Update course |
| `DELETE` | `/admin/courses/<course_id>` | `[ADMIN]` Delete course |

#### Rooms
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/rooms` | `[ADMIN]` List all classrooms |
| `POST` | `/admin/rooms` | `[ADMIN]` Add classroom. Body: `{name, capacity, resources?}` |

#### Sections
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/sections?dept_name=&year=` | `[ADMIN]` List sections with student counts |
| `POST` | `/admin/sections` | `[ADMIN]` Create section. Body: `{dept_name, year, name?, max_hours_per_day?}` — auto-assigns next letter if name omitted |

#### Swap Requests
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/swap-requests?status=pending` | `[ADMIN]` List swap requests by status |
| `POST` | `/admin/swap-requests/<id>/approve` | `[ADMIN]` Approve swap. Body: `{force_swap?: bool}` — handles conflict detection & double-move |
| `POST` | `/admin/swap-requests/<id>/reject` | `[ADMIN]` Reject swap. Body: `{reason}` |

#### Leave Requests
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/leave-requests?status=&department=&leave_type=` | `[ADMIN]` List leave requests with filters |
| `GET` | `/admin/leave-requests/<id>` | `[ADMIN]` Get single leave request details |
| `POST` | `/admin/leave-requests/<id>/approve` | `[ADMIN]` Approve leave. Body: `{admin_notes?}` |
| `POST` | `/admin/leave-requests/<id>/reject` | `[ADMIN]` Reject leave. Body: `{admin_notes}` |
| `GET` | `/admin/leave-requests/stats` | `[ADMIN]` Stats: total, pending, approved, rejected |
| `POST` | `/admin/leave-requests/bulk-action` | `[ADMIN]` Bulk approve/reject. Body: `{action: "approve"\|"reject", request_ids: []}` |

#### Timetable Generation
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/admin/generate_timetable` | `[ADMIN]` Run OR-Tools constraint solver — generates and saves full timetable |

---

### 📅 Timetable — Root & `/admin/timetable`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/get_timetable?dept_name=&year=&section=` | Public — Fetch timetable (filterable). Returns swap metadata. |
| `GET` | `/teacher/timetable` | `[TEACHER]` Personal timetable for logged-in teacher (auto-creates faculty if missing) |
| `GET` | `/student/timetable` | `[STUDENT]` Section timetable for logged-in student |
| `PUT` | `/admin/timetable/<timetable_id>` | `[ADMIN]` Update timetable entry (day, start_time, end_time, faculty_id, room_id) — triggers Google Calendar hook |
| `DELETE` | `/admin/timetable/<timetable_id>` | `[ADMIN]` Delete timetable entry — removes GCal event from all connected users |

---

### 👨‍🏫 Teacher — `/teacher`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/teacher/mark_room` | `[TEACHER]` Mark room as `free` or `occupied`. Body: `{room_id, status, notes?}` |
| `GET` | `/rooms/status` | Any authenticated user — Room status overview: free, occupied, unmarked |
| `GET` | `/teacher/swap-requests` | `[TEACHER]` View own swap requests |
| `POST` | `/teacher/swap-requests` | `[TEACHER]` Submit swap request. Body: `{original_timetable_id, proposed_day, proposed_start_time, reason}` |
| `GET` | `/teacher/students?department=&year=&section=` | `[TEACHER]` Get student list for a section |
| `GET` | `/teacher/courses?department=&year=` | `[TEACHER]` Get courses for a dept/year |
| `GET` | `/teacher/attendance/view?date=&department=&year=&section=&course_id=` | `[TEACHER]` View attendance for a session |
| `POST` | `/teacher/mark-attendance` | `[TEACHER]` Mark attendance. Body: `{attendance: [{student_id, status, notes?}], course_id?, date?}` |
| `GET` | `/teacher/departments` | `[TEACHER]` List all departments |
| `GET` | `/teacher/sections?department=&year=` | `[TEACHER]` List sections |

---

### 🎓 Student — `/student`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/student/timetable` | `[STUDENT]` Personal section timetable (also in `/student/timetable` timetable_routes) |

---

### 📤 Bulk Import — `/api/upload`

| Method | Endpoint | Required Columns | Description |
|---|---|---|---|
| `POST` | `/api/upload/students` | `username, password, dept_name, year, section_name` (+ optional `full_name, email`) | Upload CSV/Excel students with row-level error report |
| `POST` | `/api/upload/faculty` | `faculty_name, dept_name, username, password, email, max_hours` | Upload CSV/Excel faculty + auto-creates login accounts |
| `POST` | `/api/upload/departments` | `dept_name` | Bulk import departments |
| `POST` | `/api/upload/sections` | `name, year, dept_name` | Bulk import sections |
| `POST` | `/api/upload/courses` | `name, type, credits, year, semester, dept_name, hours_per_week` (+ optional `faculty_name`) | Bulk import courses |
| `POST` | `/api/upload/rooms` | `name, capacity` (+ optional `resources`) | Bulk import classrooms |

> All endpoints accept `multipart/form-data` with field `file`. Supports `.csv`, `.xlsx`, `.xls`.

---

### 🏖 Leave Requests — `/api/leave`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/leave/request` | Submit leave. Body: `{leave_type, start_date, end_date, reason}`. Overlap validation included. |
| `GET` | `/api/leave/my-requests?status=` | My leave requests (newest first) |
| `GET` | `/api/leave/request/<id>` | Single leave request details |
| `PUT` | `/api/leave/request/<id>` | Update pending leave request |
| `DELETE` | `/api/leave/request/<id>` | Cancel pending leave request |
| `GET` | `/api/leave/admin/all?status=` | `[ADMIN]` All college leave requests |
| `POST` | `/api/leave/admin/approve/<id>` | `[ADMIN]` Approve leave. Body: `{notes?}` |
| `POST` | `/api/leave/admin/reject/<id>` | `[ADMIN]` Reject leave. Body: `{notes}` (notes required) |

> Valid leave types: `sick`, `vacation`, `personal`, `emergency`, `medical`, `family`, `casual`

---

### 📊 Assessments & Grades — `/api`

#### Assessments (Performance Module — Teacher-only)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/assessments?course_id=` | `[TEACHER]` List own assessments |
| `POST` | `/api/assessments` | `[TEACHER]` Create assessment. Body: `{course_id, title, assessment_type, max_marks, scheduled_date, weightage?, scheduled_time?, duration_minutes?, location?}` |
| `GET` | `/api/assessments/<id>` | `[TEACHER]` Get assessment details |
| `PUT` | `/api/assessments/<id>` | `[TEACHER]` Update assessment |
| `DELETE` | `/api/assessments/<id>` | `[TEACHER]` Delete assessment |
| `GET` | `/api/teacher/students?course_id=` | `[TEACHER]` Students for a course/department |
| `GET` | `/api/teacher/my-courses` | `[TEACHER]` Courses assigned to logged-in teacher |

#### Grades
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/grades` | `[TEACHER]` Enter/update grades. Body: `{grades: [{student_id, assessment_id, marks_obtained, remarks?}]}` |
| `GET` | `/api/grades/assessment/<assessment_id>` | `[TEACHER]` All grades for an assessment |
| `POST` | `/api/marks/upload` | `[TEACHER]` Bulk upload marks (JSON or CSV). Body: `{assessment_id, marks: [{student_id, marks}]}` or form+file |
| `GET` | `/api/student/marks` | `[STUDENT]` My marks with course, assessment, percentage, grade letter |

#### Student Performance
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/student/assessments/upcoming` | `[STUDENT]` Upcoming assessments for student's dept/year |
| `GET` | `/api/student/grades?course_id=` | `[STUDENT]` All my grades (filterable by course) |
| `GET` | `/api/student/performance` | `[STUDENT]` Overall performance dashboard: attendance %, avg grade %, per-course breakdown |
| `GET` | `/api/student/performance/course/<course_id>` | `[STUDENT]` Performance detail for a specific course |
| `GET` | `/api/performance/course/<course_id>` | `[TEACHER]` Class performance overview for a course |
| `GET` | `/api/admin/performance/analytics` | `[ADMIN]` System-wide performance analytics |
| `GET` | `/api/admin/students/at-risk` | `[ADMIN]` List at-risk students grouped by student |

---

### 📝 Assignments — `/api`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/assignments/create` | `[TEACHER]` Create assignment with optional file. `multipart/form-data`: `{title, description?, due_date?, target_audience, course_id?, dept_id?, section_id?, file?}` |
| `GET` | `/api/student/assignments` | `[STUDENT]` View assignments for my section/dept |
| `GET` | `/api/faculty/assignments` | `[TEACHER]` View assignments I created |

---

### ⚖️ Faculty Workload — `/api`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/workload/current` | `[TEACHER]` Current week workload: teaching hours, meeting hours, %, status |
| `GET` | `/api/workload/history?weeks=12` | `[TEACHER]` Historical workload for N weeks |
| `GET` | `/api/meetings` | `[TEACHER]` My meetings (as organizer or participant) |
| `POST` | `/api/meetings` | `[TEACHER]` Create internal faculty meeting. Body: `{title, start_datetime, end_datetime, description?, location?, meeting_type?, participant_faculty_ids?}` |
| `PUT` | `/api/meetings/<id>` | `[TEACHER]` Update meeting (organizer only) |
| `DELETE` | `/api/meetings/<id>` | `[TEACHER]` Cancel meeting (organizer only) — recalculates workload |
| `GET` | `/api/admin/workload-overview` | `[ADMIN]` All faculty workloads for current week |
| `GET` | `/api/admin/workload-alerts` | `[ADMIN]` Lists overloaded and underloaded faculty |

---

### 📅 Meetings (Student/Teacher Facing) — `/api`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/meetings/create` | `[TEACHER\|ADMIN]` Create audience-targeted meeting with optional Google Meet link. Body: `{title, start_time, description?, audience_role, dept_id?, year?, section_id?, manual_link?}`. Auto-notifies target users. Requires `meetings` feature flag. |
| `GET` | `/api/meetings` | Any auth user — Fetch upcoming meetings visible to current user based on audience targeting |

---

### 🗓 Google Calendar — `/api`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/auth/google/url?redirect_uri=` | Get OAuth authorization URL for Google |
| `POST` | `/api/auth/google/callback` | Exchange OAuth code for tokens + trigger initial sync. Body: `{code, redirect_uri}` |
| `GET` | `/api/calendar/status` | Get GCal connection status, last sync time, sync status, errors |
| `POST` | `/api/calendar/sync` | Manually trigger full timetable sync to Google Calendar |
| `POST` | `/api/calendar/disconnect` | Remove stored tokens and disconnect Google Calendar |

---

### 🔔 Notifications — `/api`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/notifications` | Fetch last 50 notifications + unread count |
| `DELETE` | `/api/notifications` | Clear all notifications |
| `PUT` | `/api/notifications/<id>/read` | Mark specific notification as read |
| `PUT` | `/api/notifications/read-all` | Mark all notifications as read |
| `GET` | `/api/notifications/preferences` | Get personal notification preferences |
| `PUT` | `/api/notifications/preferences` | Update preferences: `{email_enabled, app_enabled, system_alerts, academic_updates, resource_updates}` |
| `POST` | `/api/admin/notifications/send` | `[ADMIN\|TEACHER]` Send targeted notification (JSON). Body: `{title, message, target_audience, target_role?, target_user_id?, target_dept_id?, target_section_id?}` |
| `POST` | `/api/admin/notifications/send-with-file` | `[ADMIN\|TEACHER]` Send notification with file attachment (`multipart/form-data`, max 5 MB) |
| `GET` | `/api/admin/notifications/targets` | `[ADMIN\|TEACHER]` Get users, departments, sections for targeting UI |
| `POST` | `/api/notifications/test` | Trigger a test notification for yourself |

---

### 🤖 AI Chatbot & Announcements — `/api/chat`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/chat/chatbot` | Send message to AI assistant. Body: `{message}`. Requires `ai_chatbot` feature. |
| `GET` | `/api/chat/conversation` | Get last 50 messages from conversation history |
| `POST` | `/api/chat/clear` | Clear all chatbot conversation history |
| `GET` | `/api/chat/announcements` | Get active, non-expired announcements for current user's role |
| `POST` | `/api/chat/announcements` | `[ADMIN]` Create announcement. Body: `{title, message, priority?, target_roles?, expires_at?}` |

---

### 📁 Static File Serving

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/uploads/<filename>` | Serve uploaded files (notification attachments, assignment files) |

---

## 👥 User Roles & Permissions

| Role | Login Portal | Key Capabilities |
|---|---|---|
| **SuperAdmin** | `/api/admin/login` | Create/manage colleges, toggle features, view platform stats. Bypasses tenant filtering. |
| **Admin** | `/api/admin/login` | Full CRUD on faculty, students, courses, rooms, sections within their college. Approve/reject swaps and leaves. Generate timetables. Send notifications. |
| **Teacher** | `/api/login` | View own timetable, mark attendance, submit swap requests, manage assessments/grades/assignments, view workload, create meetings. |
| **Student** | `/api/login` | View timetable, attendance, grades, assignments, upcoming assessments. Use AI chatbot. |

---

## 🏢 Multi-Tenancy Design

EduSync uses **college-scoped row-level isolation**:

1. Every model includes a `college_id` foreign key.
2. `tenant_middleware.py` decodes the JWT on every request and sets `g.college_id` and `g.is_super_admin`.
3. `query_filter.py` registers a SQLAlchemy `before_compile` event that appends `WHERE college_id = :college_id` to all queries for tenanted models.
4. SuperAdmin bypasses this filter and sees all data.
5. Public routes (`/api/login`, `/api/register`, `/`) are whitelisted from tenant checks.
6. Feature flags: `require_feature('ai_chatbot')` decorator blocks endpoints for colleges without that feature enabled.

---

## 🔐 Security

| Mechanism | Detail |
|---|---|
| **Password Hashing** | `pbkdf2:sha256` via Werkzeug. Plain-text passwords auto-migrated on login. |
| **JWT Authentication** | HS256 signed, 24h expiry. Includes `college_id` for tenant scoping. |
| **OAuth Token Encryption** | Google tokens encrypted with Fernet (AES-128) before DB storage. Generate key once: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` |
| **File Upload Validation** | Extension whitelist + 5 MB size limit enforced server-side |
| **CORS** | Configured per-environment via `CORS_ORIGINS` env var |
| **Tenant Isolation** | Every DB query scoped to `college_id` automatically |
| **Role Guards** | `@admin_required`, `@teacher_required`, `@require_super_admin` decorators |
| **Setup Endpoint** | `SETUP_SECRET` env var — disable after first use with `SETUP_SECRET=disabled` |

---

## 📁 Project Structure

```
backend/
├── app.py                          # Flask app factory + blueprint registration
├── config.py                       # Dev/Prod/Test config classes
├── extensions.py                   # db, cors, mail, scheduler instances
├── models/
│   ├── __init__.py                 # Exports all 28 models
│   ├── college.py                  # College (tenant)
│   ├── user.py                     # All user roles
│   ├── department.py / section.py
│   ├── faculty.py / faculty_workload.py / faculty_unavailability.py
│   ├── course.py / course_allocation.py
│   ├── classroom.py / room_occupancy.py
│   ├── timetable.py / swap_request.py
│   ├── attendance.py
│   ├── assessment.py / grade.py / student_performance.py
│   ├── assignment.py
│   ├── meeting.py / booking.py / resource.py
│   ├── leave_request.py
│   ├── notification.py / system_announcement.py
│   ├── user_google_auth.py / calendar_event_map.py
│   └── chatbot_conversation.py
├── routes/                         # 20 Flask Blueprints
├── services/
│   ├── google_calendar_service.py  # OAuth, sync, Meet generation
│   ├── scheduler_service.py        # OR-Tools timetable generator
│   └── email_service.py
└── utils/
    ├── tenant_middleware.py        # JWT → g.college_id
    ├── query_filter.py             # Auto WHERE college_id
    ├── decorators.py               # Auth/role decorators
    ├── chatbot_utils.py            # Intent detection + handlers
    ├── export_utils.py             # CSV export
    └── timetable_utils.py          # Conflict detection

frontend/src/
├── App.jsx                         # Routes (admin/teacher/student portals)
├── api.jsx                         # 21KB centralized Axios API service
├── pages/
│   ├── Login/                      # Multi-portal login
│   ├── Dashboard/                  # Admin dashboard
│   ├── TeacherDashboard.jsx        # Full teacher portal (52KB)
│   ├── StudentDashboard.jsx        # Student portal (32KB)
│   ├── Admin/
│   │   ├── SuperAdminDashboard.jsx
│   │   ├── NotificationManager.jsx
│   │   └── RegisterUser.jsx
│   ├── Teachers/
│   │   ├── AssessmentManager.jsx
│   │   ├── AssignmentManager.jsx
│   │   ├── MarkAttendance.jsx
│   │   ├── MyRequestsModal.jsx
│   │   └── teachers.jsx
│   ├── Timetable/
│   ├── Courses/ / Sections/ / Students/ / rooms/
│   └── Studentdashboard/

mobile/src/
├── screens/
│   ├── teacher/  (TeacherDashboard, TeacherTimetable, MarkAttendance, SwapRequests, RoomStatus)
│   ├── student/  (StudentDashboard, StudentTimetable, StudentAttendance)
│   ├── admin/
│   ├── auth/
│   ├── leave/
│   └── shared/ / common/
├── navigation/
├── services/
└── context/
```

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.8+**
- **Node.js 16+** and npm
- **Git**

### 1. Clone the Repository
```bash
git clone <repository-url>
cd timetable-project
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate
# Activate (Linux/macOS)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit backend/.env with your values

# Start the server
python app.py
```

✅ **Backend starts at:** `http://127.0.0.1:5000`

**On first run, the system automatically:**
- Creates the SQLite database (`timetable_enhanced.db`)
- Seeds a **Default College** (`college_code: DEFAULT`)
- Seeds a **SuperAdmin** account → `superadmin` / `Super@123`
- Creates the `uploads/` directory

### 3. Frontend Setup

```bash
# New terminal from project root
cd frontend
npm install
npm run dev
```

✅ **Frontend starts at:** `http://localhost:5173`

### 4. Mobile Setup (Optional)

```bash
cd mobile
npm install

# Start Expo
npm start
# For specific platform
npm run android
npm run ios
```

> See `mobile/HOW_TO_CONNECT.md` to configure the API URL for local development.

### ⚡ Windows One-Click Start
```bat
# From project root
start_app.bat
```

---

## 🔐 Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `SECRET_KEY` | ✅ Yes | `TimetableSecretKey2025` | JWT signing key — **change in production** |
| `FLASK_ENV` | ✅ Yes | `development` | `development` or `production` |
| `DATABASE_URL` | ⚠️ Prod | SQLite | PostgreSQL connection string for production |
| `MAIL_USER` | ❌ Optional | — | Gmail address for sending emails |
| `MAIL_PASS` | ❌ Optional | — | Gmail App Password (not account password) |
| `GOOGLE_CLIENT_ID` | ❌ Optional | — | Google OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | ❌ Optional | — | Google OAuth 2.0 Client Secret |
| `FERNET_SECRET_KEY` | ❌ Optional | — | AES key for OAuth token encryption |
| `CORS_ORIGINS` | ❌ Optional | `localhost:5173,5174` | Comma-separated allowed origins |
| `SETUP_SECRET` | ❌ Optional | — | One-time admin setup key — set to `disabled` after use |

**Generate Fernet key:**
```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### Frontend (`frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend URL (default: `http://localhost:5000`) |

---

## ☁️ Deployment

### Google Cloud Run (GCP) — Active Production 🚀
The system is fully Dockerized and optimized for Google Cloud Run, utilizing a multi-stage Dockerfile that bundles the React frontend (served via Nginx) alongside the Flask Gunicorn backend in a single container.

**Active Live Environment:**
- **URL:** [https://edu-77160732294.asia-south1.run.app](https://edu-77160732294.asia-south1.run.app)
- **Region:** `asia-south1`
- **Database:** Managed PostgreSQL instance.

**GCP Deployment Commands:**
```bash
# 1. Build the production image
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/eduscheduler

# 2. Deploy to Cloud Run
gcloud run deploy eduscheduler \
  --image gcr.io/YOUR_PROJECT_ID/eduscheduler \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars="FLASK_ENV=production,DATABASE_URL=your_postgres_url,SECRET_KEY=...,FERNET_SECRET_KEY=...,GOOGLE_CLIENT_ID=...,GOOGLE_CLIENT_SECRET=..."
```

---

### Render (Alternative / Dev Deployment)

The `render.yaml` at project root provisions:
- A **Python web service** running `gunicorn --chdir backend app:app`
- A **managed PostgreSQL** database with `DATABASE_URL` auto-injected

**Steps:**
1. Push to GitHub
2. Connect to Render → "New Blueprint"
3. After deployment, set these secret env vars in Render dashboard:
   - `MAIL_USER`, `MAIL_PASS`
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - `FERNET_SECRET_KEY`

### Manual Production

```bash
# Backend
cd backend
gunicorn app:app --bind 0.0.0.0:5000 --workers 4

# Frontend — build static files
cd frontend
npm run build
# Serve dist/ with nginx, Vercel, Netlify, or Cloudflare Pages
```

---

## 🔑 Default Credentials

> ⚠️ **Change all passwords immediately in production!**

| Role | College Code | Username | Password |
|---|---|---|---|
| **SuperAdmin** | `DEFAULT` | `superadmin` | `Super@123` |
| **Admin** (sample) | `DEFAULT` | `admin` | `password123` |
| **Teacher** (sample) | `DEFAULT` | `teacher1` | `password123` |
| **Student** (sample) | `DEFAULT` | `student1` | `password123` |

---

## 📎 Additional Documentation

| File | Contents |
|---|---|
| [`HOW_TO_RUN.md`](HOW_TO_RUN.md) | Step-by-step run guide with troubleshooting |
| [`QUICK_START.md`](QUICK_START.md) | 5-minute quickstart |
| [`backend/REVIEW_REPORT.md`](backend/REVIEW_REPORT.md) | Detailed backend architecture review |
| [`backend/.env.example`](backend/.env.example) | All backend environment variables documented |
| [`mobile/HOW_TO_CONNECT.md`](mobile/HOW_TO_CONNECT.md) | Mobile app backend connection setup |
| [`mobile/QUICK_SETUP.md`](mobile/QUICK_SETUP.md) | Quick mobile setup guide |
| [`TODO.md`](TODO.md) | Pending features and known issues |
| [`render.yaml`](render.yaml) | Render cloud deployment blueprint |

---

## 📄 License

This project is proprietary. All rights reserved.

---

*Built with ❤️ as a production-ready academic management platform.*