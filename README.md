# B2B Cleaning Service Management Platform

A full-stack platform for cleaning and facility management companies. Admins manage leads, scheduling, and agents; field agents view assigned tasks and update job status.

## Tech Stack

- **Frontend:** React 18, Vite, TypeScript, React Router, Zustand
- **Backend:** Node.js, Express, TypeScript, Mongoose
- **Database:** MongoDB

## Project Structure

```
Cleaning Agent/
├── backend/                 # Node.js API
│   ├── src/
│   │   ├── config/          # App & DB config
│   │   ├── shared/           # Models, middleware, utils, types
│   │   ├── modules/          # Feature modules (auth, users, agents, leads, schedules, assignments, task-logs, dashboard, audit)
│   │   ├── app.ts
│   │   └── server.ts
│   └── package.json
├── frontend/                 # React (Vite) SPA
│   ├── src/
│   │   ├── api/             # API client & endpoints
│   │   ├── components/      # Shared UI
│   │   ├── layouts/         # Admin & Agent layouts
│   │   ├── pages/           # Auth, Admin, Agent screens
│   │   ├── store/           # Auth state (Zustand)
│   │   ├── types/
│   │   └── styles/
│   └── package.json
└── package.json              # Root scripts
```

## User Roles

- **Super Admin:** System-level access, manages admins (Users screen).
- **Admin:** Leads, Schedule, Agents, Dashboard, Reports, Audit Logs.
- **Agent:** My Tasks, Task Detail, update status (Pending → In Progress → Completed).

## Adding an Admin (Spec: Section 3 – Super Admin manages admins)

Only a **Super Admin** can add or manage admin users.

1. Log in as **Super Admin** (e.g. `admin@cleaning.com` / `Admin@123` after seed).
2. Go to **Admin → Users** (nav item visible only for super_admin).
3. Create a new user with **role: `admin`** (name, email, password).  
   - API: `POST /api/users` with body `{ "name", "email", "password", "role": "admin" }` (requires `Authorization: Bearer <super_admin_token>`).

The new admin can log in and access all admin screens (Dashboard, Leads, Schedule, Assignments, Agents, Reports, Audit Logs); they do **not** see the Users screen.

## Adding an Agent (Spec: Section 4 – Agent Management Module)

**Admin** or **Super Admin** adds agents in two steps: create a user with role `agent`, then create an agent profile linked to that user.

1. **Create the agent user**  
   - **Option A (UI):** Super Admin only – Admin → **Users** → Create user with **role: `agent`** (name, email, password).  
   - **Option B (API):** `POST /api/auth/register` with `{ "name", "email", "password", "role": "agent" }` (no auth required), or Super Admin uses `POST /api/users` with `role: "agent"`.

2. **Create the agent profile**  
   - Go to **Admin → Agents** → Create agent: select the **User** (the one with role `agent`), set phone, skills, daily capacity, experience, etc.  
   - API: `POST /api/agents` with `{ "userId": "<user_id>", "phone?", "skills?", "dailyCapacity?", "experience?" }` (requires admin/super_admin token).

The agent can then log in, see **My Tasks**, and update job status (Pending → In Progress → Completed). Assignments are created by admin from Schedule/Leads and linked to an agent.

## Setup

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit .env: set MONGODB_URI, JWT_SECRET
npm install
npm run seed    # Creates admin@cleaning.com / Admin@123
npm run dev     # http://localhost:4000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev     # http://localhost:5173 (proxies /api to backend)
```

### 3. Run both (from root)

```bash
npm install
npm run dev     # Backend + Frontend concurrently
```

## Default Login (after seed)

- **Email:** admin@cleaning.com  
- **Password:** Admin@123  
- **Role:** super_admin  

## API Overview

| Area        | Endpoints |
|------------|-----------|
| Auth       | POST /api/auth/login, POST /api/auth/register, GET /api/auth/me |
| Users      | GET/POST/PATCH/DELETE /api/users (super_admin) |
| Agents     | GET/POST/PATCH/DELETE /api/agents |
| Leads      | GET/POST/PATCH/DELETE /api/leads |
| Schedules  | GET/POST/PATCH/DELETE /api/schedules, GET /api/schedules/lead/:leadId |
| Assignments| GET/POST /api/assignments, GET /api/assignments/my-tasks, PATCH /api/assignments/:id/status, DELETE |
| Task logs  | GET /api/task-logs/assignment/:assignmentId |
| Dashboard  | GET /api/dashboard/overview |
| Audit      | GET /api/audit |

All except login/register require `Authorization: Bearer <token>` and role-based access.

## Frontend UI & Role Validation

**UI screens (all created):**

| Area | Screen | Route | Who sees it |
|------|--------|--------|-------------|
| Auth | Login | `/login` | Unauthenticated |
| Admin | Dashboard | `/admin/dashboard` | admin, super_admin |
| Admin | Leads List | `/admin/leads` | admin, super_admin |
| Admin | Create/Edit Lead | `/admin/leads/new`, `/admin/leads/:id/edit` | admin, super_admin |
| Admin | Schedule View | `/admin/schedule` | admin, super_admin |
| Admin | Assignments | `/admin/assignments` | admin, super_admin |
| Admin | Agent Management | `/admin/agents` | admin, super_admin |
| Admin | Reports | `/admin/reports` | admin, super_admin |
| Admin | **User Management** | `/admin/users` | **super_admin only** (nav + route guard) |
| Admin | Audit Logs | `/admin/audit` | admin, super_admin |
| Agent | My Tasks | `/agent/tasks` | agent |
| Agent | Task Detail / Job History | `/agent/tasks/:id` | agent |

**Role validation (frontend):**

- **Constants:** Role strings come from `ROLES` in `src/types/index.ts` (`ROLES.SUPER_ADMIN`, `ROLES.ADMIN`, `ROLES.AGENT`) so keys stay consistent and typo-free.
- **Route guards:**  
  - `/admin/*` → `ProtectedRoute` with `allowedRoles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}`.  
  - `/agent/*` → `ProtectedRoute` with `allowedRoles={[ROLES.AGENT]}`.  
  - `/admin/users` → wrapped in `SuperAdminOnly`; non–super_admin is redirected to `/admin/dashboard`.
- **Nav:** “Users” link in the admin sidebar is shown only when `user?.role === ROLES.SUPER_ADMIN`.
- **Post-login redirect:** Agent → `/agent/tasks`; Admin/Super Admin → `/admin/dashboard` (using `ROLES.AGENT`).
- **Auth store:** `isAdmin()`, `isAgent()`, `isSuperAdmin()` use `ROLES` for checks.

## Development Notes

- Backend uses a **layered architecture**: routes → controllers → services → repositories. New features can be added as new modules under `backend/src/modules/` with minimal impact on existing code.
- Frontend uses **role-based routing**: `/admin/*` for admin/super_admin, `/agent/*` for agent. Add new pages under the appropriate layout and route in `App.tsx`.
- Task lifecycle: **Pending → In Progress → Completed** (agent). Admin-only: Rescheduled, Cancelled, On Hold.
- JWT is stored in localStorage and sent with every API request. Logout clears the store and token.

## Spec Compliance (Technical & Functional Specification)

This project follows the B2B Cleaning Service Management Platform specification:

| Section | Coverage |
|--------|----------|
| **3. User Roles** | Super Admin, Admin, Agent with RBAC. **Adding admin:** Super Admin only, via Users screen / POST /api/users (role: admin). **Adding agent:** Admin/Super Admin – create user (role: agent) then create Agent profile via Agents screen / POST /api/agents (userId). |
| **4. Functional Modules** | Auth, Admin Management (**add admin** per above), Agent Management (**add agent** per above), Lead & Job, Scheduling & Assignment, Task Execution, Dashboard & Analytics, Audit Logs |
| **5. Lead / Cleaning Job** | Client info, Location (address, city, state, pincode; geo-coordinates in model for future), Cleaning details, **Resources** (materials, machines, safety gear, power/water), SLA priority |
| **6. Agent Data Model** | Personal details, contact, skills, availability, daily capacity, experience, status |
| **7. Task Lifecycle** | Pending → In Progress → Completed (agent); Rescheduled, Cancelled, On Hold (admin-only) enforced in backend and Admin Assignments screen |
| **8. Database** | Users, Agents, Leads, Schedules, Assignments, TaskLogs (MongoDB) |
| **9–10. Backend & API** | Node.js layered architecture, JWT, role checks, CRUD and status APIs |
| **11–13. Frontend** | React (Vite), role-based routing, Admin & Agent layouts; Admin: Login, Dashboard, Leads, Create/Edit Lead (with Resources), Schedule, **Assignments**, Agents, Reports, Users, Audit; Agent: Login, My Tasks, Task Detail, Update Status, **Job History** |
| **14–15. Security** | JWT, password hashing, validation, audit logging |
| **17. Phases** | Phase 1 MVP implemented; Phase 2 (Billing & Notifications) and Phase 3 (Automation & Client Portal) planned |

## Future Phases (from spec)

- **Phase 2:** Billing & Notifications  
- **Phase 3:** Automation & Client Portal  
