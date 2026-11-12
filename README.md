# Renaissance Group — HR Task Responsibility Performance System & Recruitment Status Portal

An enterprise-grade, real-time Human Resources & Organizational Development (HR & OD) Management System built for **Renaissance Group**.

This portal combines **Talent Acquisition (MRF Recruitment & Checklist)**, **Head of Department (HOD) Manpower Tracking**, **Turnaround SLA Analytics (with 60-day Time-to-Fill Baseline)**, and **Employee Task & KPI Performance Management**.

---

## 🌟 Key Highlights & Features

### 1. Talent Acquisition & MRF Recruitment Portal
- **Master MRF Register**: Centralized tracking for all Manpower Requisition Forms across 6 corporate entities: `RAL`, `SGL`, `PSL`, `MTSL`, `RDL`, `RBL`.
- **HOD-Wise Recruitment Module**: Automatic categorization of requisitions by Head of Department with quick filters and expandable accordion views.
- **Dedicated Joined Category**: Instant relocation and visual confirmation when a candidate's status is updated to `Joined`.
- **60-Day Turnaround SLA Rating**: Time-to-Fill (TTF) calculation baseline evaluated at 60 days with automated employee performance scoring.
- **Excel & PDF Interoperability**:
  - 1-click **Excel Import** with smart header auto-mapping and sample `.xlsx` template generator.
  - Formatted **Excel (.xlsx)** and **PDF** export for executive reports.
- **Role-Based Access Control (RBAC)**:
  - Authorized HR Editors: `Shahriyar Naiem (Manager, HR & OD)`, `Quazi Nuzhat Rahman`, `Sabbir Hossain`, `Fariha Nasmi`, `Maisha Islam`, `System Admin`.
  - Evaluators: `Syeda Shaila Ashraf (Head of HR)`, `Shahriyar Naiem`.

### 2. Task & KPI Management System
- **Task Register**: Multi-status workflow (`Pending`, `In Progress`, `Submitted for Review`, `Completed`, `Overdue`).
- **Poked & Overdue Alert Center**: Real-time SLA tracking with poke nudges and escalation alerts.
- **KPI Management**: Objective weightage, target vs. actual achievement, and review workflows.
- **Employee Directory**: Individual employee profiles, workloads, and task histories.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Motion |
| **Backend** | Node.js, Express.js, TypeScript (tsx) |
| **Database & ORM** | PostgreSQL (Cloud SQL), Drizzle ORM |
| **Data Export** | SheetJS (xlsx), jsPDF, jsPDF-AutoTable |
| **Typography** | Plus Jakarta Sans, JetBrains Mono (Tabular numerals) |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18.x or v20.x or v22.x
- **npm** or **bun** / **yarn** / **pnpm**
- **PostgreSQL** database (optional for local mock or use provided Cloud SQL connection)

### 2. Installation
Clone your repository or extract the downloaded zip file:

```bash
# Navigate to the project directory
cd rg-hr-portal

# Install dependencies
npm install
```

### 3. Environment Setup
Copy the example environment file:

```bash
cp .env.example .env
```

Configure your `.env` variables if using an external database:
```env
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/hr_portal_db
AUTH_SECRET=your-secure-random-auth-secret-here
AUTH_SALT=your-secure-random-salt-here
```

### 4. Run Development & Production Server
```bash
# Development (starts Express with Vite middlewares & instant HMR):
npm run dev

# Production Build & Start:
npm run build
npm start
```

Open your browser at:
```
http://localhost:3000
```

---

## 🔒 Security Hardening & Zero-Stale-Cache Architecture

1. **Pure Database-Driven Real-Time Sync**:
   - The application strictly queries the PostgreSQL database in real-time.
   - All static mock storage and local cache fallbacks have been removed.
   - Cache-busting timestamps (`?_t=timestamp`) and anti-cache HTTP headers (`Cache-Control: no-store, no-cache, must-revalidate`, `Pragma: no-cache`) are enforced on both server and client. Every employee immediately receives the latest master records on login and refresh.

2. **Role-Based Access Control (RBAC)**:
   - System Admin (`02-02-2222`): Full operational and database administration privileges.
   - Head of HR (`01-02-0440`) & Manager, HR & OD (`22-02-1826`): Requisition creation, modification, rating, and approval privileges.
   - HR Executives (`22-02-1330`, `22-02-1642`, `02-02-2059`, `22-02-1551`): Full recruitment data entry and checklist editing privileges.

3. **Protection Against Common Web Vulnerabilities**:
   - **SQL Injection**: Prevented via Drizzle ORM parametrized query builders.
   - **XSS & Content Sniffing**: Prevented via `X-Content-Type-Options: nosniff`, `X-XSS-Protection: 1; mode=block`, and React's automatic DOM sanitization.
   - **Brute Force & DoS**: Protected via in-memory IP rate-limiting (`1000 requests/minute`) and timing-safe password verification.
   - **Environment Variables**: Zero plain-text credentials in Git. All secrets managed via `.env`.

---

## 📦 How to Upload to GitHub

Follow these steps in your terminal to publish this codebase to your GitHub account:

```bash
# 1. Initialize git repository
git init

# 2. Stage all files
git add .

# 3. Create your initial commit
git commit -m "feat: complete production-ready Renaissance Group HR & Recruitment Portal"

# 4. Set main branch
git branch -M main

# 5. Link your GitHub remote repository (replace with your repo URL)
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPOSITORY_NAME.git

# 6. Push to GitHub
git push -u origin main
```

---

## 🌐 Full-Stack Cloud Deployment (Railway / Render / Cloud Run / VPS)

For a complete full-stack deployment where both the Node.js Express backend and React frontend run together with a persistent PostgreSQL database:

1. **Build Command**: `npm install && npm run build`
2. **Start Command**: `npm start` (or `node server.ts` with `tsx`)
3. **Environment Variables**:
   - Set `DATABASE_URL` to your PostgreSQL database URI.
   - Set `PORT` (defaults to `3000` or the platform's `$PORT`).
   - Set `AUTH_SECRET` and `AUTH_SALT` to random high-entropy strings.

## 📁 Project Directory Structure

```
.
├── index.html                           # HTML5 Entry Point with Plus Jakarta Sans & JetBrains Mono
├── package.json                         # Project dependencies and npm scripts
├── server.ts                            # Full-Stack Express.js server & API routes
├── tsconfig.json                        # TypeScript configuration
├── vite.config.ts                       # Vite configuration with Tailwind CSS v4
├── src/
│   ├── main.tsx                         # React application root
│   ├── App.tsx                          # Core application controller & module router
│   ├── index.css                        # Tailwind CSS v4 styling & dark mode setup
│   ├── context/
│   │   └── AuthContext.tsx              # Corporate authentication context
│   ├── lib/
│   │   └── api.ts                       # Typed client API service
│   ├── types/
│   │   └── index.ts                     # TypeScript data interfaces & types
│   ├── db/
│   │   ├── index.ts                     # Drizzle ORM database client
│   │   ├── schema.ts                    # PostgreSQL database schema definitions
│   │   ├── seed.ts                      # Initial tasks and employee seed data
│   │   └── seedRecruitment.ts           # Initial recruitment requisitions seed data
│   ├── server/
│   │   └── authService.ts               # Timing-safe authentication & session management
│   └── components/
│       ├── Navbar.tsx                   # Top corporate navigation with module switcher
│       ├── Sidebar.tsx                  # Executive sidebar navigation
│       ├── LoginScreen.tsx              # Single Sign-On corporate login screen
│       ├── DashboardView.tsx            # Task & KPI executive dashboard
│       ├── TaskRegisterView.tsx         # Comprehensive task register table with filters
│       ├── EmployeeDirectoryView.tsx    # Employee directory & workload monitor
│       ├── ReportsExportView.tsx        # Task & KPI reports export
│       └── recruitment/
│           ├── RecruitmentDashboardView.tsx      # Main Recruitment Dashboard & HOD Checklist
│           ├── RecruitmentChecklistView.tsx      # Full MRF master checklist table
│           ├── RecruitmentModal.tsx              # Add/Edit Requisition modal with required HOD fields
│           ├── RecruitmentExcelImportModal.tsx   # Excel import modal with column mapping guide
│           ├── RecruitmentPerformanceView.tsx    # Employee recruitment workload & rating
│           ├── RecruitmentAnalyticsView.tsx      # Velocity, SLA & department breakdown
│           ├── RecruitmentCalendarView.tsx       # DOJ & offer letter calendar
│           ├── RecruitmentReportsView.tsx        # Excel & PDF reporting
│           ├── RecruitmentCharts.tsx             # 3D Donut, Trends, and Bar charts
│           └── RecruitmentRealtimeIndicator.tsx  # Multi-user synchronization indicator
└── public/
    └── rg-hr-recruitment-portal-repo.zip # 1-click downloadable repository archive
```

---

## 🔒 Security & Access Credentials

The portal includes pre-configured corporate personas with role-based permissions and dual authentication support (Server PBKDF2 + Resilient Client Fallback):

| Employee Code | Name | Role / Designation | Default Password | Access Level |
|---|---|---|---|---|
| `22-02-1826` | Shahriyar Naiem | Manager, HR & OD | `manager123` (or ID) | Full HR Access (Create, Edit, Import, Rate) |
| `01-02-0440` | Syeda Shaila Ashraf | Head of HR | `hr123` (or ID) | Full Executive & HR Access (Create, Edit, Import, Rate) |
| `22-02-1330` | Quazi Nuzhat Rahman | Senior Executive, HR | `manager123` (or ID) | Full HR Access (Create, Edit, Import, Rate) |
| `22-02-1642` | Sabbir Hossain | Executive, HR | `manager123` (or ID) | Full HR Access (Create, Edit, Import, Rate) |
| `02-02-2059` | Fariha Nasmi | Assistant Executive, HR | `manager123` (or ID) | Full HR Access (Create, Edit, Import, Rate) |
| `22-02-1551` | Maisha Islam | Assistant Executive, HR | `manager123` (or ID) | Full HR Access (Create, Edit, Import, Rate) |
| `02-02-2222` | System Administrator | IT & HR Systems Admin | `admin123` (or ID) | Full Administrative Access |

---

## 📄 License & Confidentiality

**Confidential & Proprietary** • Renaissance Group Department of Human Resources & Organizational Development (HR & OD).
