# Relay Task Management Engine - Frontend Application

Next.js 16 (App Router) + React 19 Frontend for Enterprise Deliverables Management.

## Tech Stack
- **Framework:** Next.js 16 (Turbopack, App Router)
- **UI Engine:** React 19 (TypeScript 5.8 strict)
- **Styling:** Tailwind CSS 4 + Radix UI Primitives + Lucide Icons (Relay theme)
- **Data Fetching:** TanStack Query v5 + Axios (with credentials / cookie passing)
- **State Management:** Zustand 5 (Auth store & Task modal state)
- **Form & Dialogs:** React Hook Form, SweetAlert2
- **Tooling:** Biome 2.4.2 + Husky + Commitlint (Conventional Commits)

## Core Architectural & UX Capabilities

1. **Dual Dashboard Views (Kanban Board vs Deliverables Table)**:
   - **Kanban Board View:** 4 dynamic stage columns (`To Do`, `In Progress`, `In Review`, `Done`). Tasks with unfinished prerequisites display a prominent **Blocked** badge with an interactive tooltip detailing pending dependencies.
   - **Deliverables Table View (`DeliverablesTableView`):** Comprehensive data table powered by Relay Query Engine (`ezfilter`), featuring substring search, department filtering, multi-column sorting, and server-side pagination.
2. **Super Admin Team Management (`/admin/users`)**:
   - Dedicated team governance portal accessible by `SUPER_ADMIN`.
   - Real-time user search (name & email) with 300ms debounce.
   - Filter by Role (`SUPER_ADMIN`, `PRODUCT_MANAGER`, `INTERNAL_TEAM`, `CLIENT_GUEST`) and Department.
   - User table displaying roles, departments, workloads (assigned task count, project count), and joined date.
   - Modals for creating users, editing user profiles & roles, resetting passwords, and deactivating accounts with built-in safety guards.
3. **Self-Service Account Settings (`/settings`)**:
   - Accessible by all authenticated users.
   - **Profile Tab:** Update full name and avatar URL with live image preview.
   - **Security Tab:** Change password with old password verification, minimum length validation (8+ characters), and show/hide password toggle.
4. **Workspace Lifecycle & Archive / Restore**:
   - Create new project (`CreateProjectModal`) with automatic enrollment of active team members and optional initial client assignment.
   - Workspace Collaborators modal (`ProjectMembersModal`) to enroll/remove internal team members and map client stakeholders.
   - Workspace action menu to soft-delete / archive projects.
   - Archived projects modal (`ArchivedProjectsModal`) to view archived workspaces and restore them along with child deliverables in 1 click.
5. **State-Based Permissions Protection**:
   - Action buttons and status transition selectors dynamically adapt to backend RBAC/ABAC rules.
   - Managers (PM & Super Admin) cannot complete tasks to `DONE` (reserved for executor).
   - Engineers cannot edit core task descriptions, titles, assignees, or due dates.
6. **Optimistic Locking Conflict Resolution (HTTP 409)**:
   - Automatically catches HTTP `409 Conflict` errors and presents `ConflictModal`.
   - Explains the concurrency collision and offers a single-click **Reload Latest State** action to preserve data integrity.
7. **Multi-Tenant Client Guest Portal (`ClientMetricsView`)**:
   - Dedicated dashboard for Client stakeholders displaying aggregate completion metrics and progress bars.
   - All internal engineering names, avatars, emails, and departments are scrubbed and masked.
8. **Daily Standup Intelligence (`/standup`)**:
   - Visual dashboard aggregating 24h audit logs into "Completed Yesterday" and "Blocked Today" by department.
   - Filterable across all projects (*Cross-Team Intel*) or scoped to a specific project.
9. **The 4 UI States on Every View**:
   - `Loading`: Skeleton shimmer components.
   - `Success`: Interactive cards, tables, and widgets.
   - `Empty`: Contextual illustrations with Call-To-Action buttons.
   - `Error`: Human-readable error messages with retry triggers.

## Getting Started

### 1. Prerequisites
- Node.js 20+ / 22 LTS
- Running backend instance (default: `http://localhost:4000`)

### 2. Environment Variables
Create `.env.local`:
```bash
NEXT_PUBLIC_BE_URL=http://localhost:4000
```

### 3. Install & Run Development Server
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Running Tests & Quality Checks
```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```

## Seeded Test Credentials
You can log in at `/login` using any of the following seeded assessment test credentials:

| Role | Department | Email | Password | Primary Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | Management | `admin@relay.id` | `Password123!` | Team Management (`/admin/users`), Project Archive/Restore, Full Access |
| **Product Manager** | Product | `pm@relay.id` | `Password123!` | Create deliverables, set dependencies, reopen tasks, manage visibility |
| **Frontend Engineer** | Frontend | `fe@relay.id` | `Password123!` | UI deliverable execution, complete tasks as assignee |
| **Backend Engineer** | Backend | `be@relay.id` | `Password123!` | API deliverable execution, complete tasks as assignee |
| **UI/UX Designer** | UI/UX | `uiux@relay.id` | `Password123!` | Visual deliverable execution, mockup attachments |
| **Client Guest** | External | `client@client.com` | `Password123!` | Client portal, progress tracking with masked internal identities |

---

## 🤖 AI Agent Guidelines
For instructions, coding conventions, and architectural rules for AI Coding Agents, refer to:
- [`frontend/AGENTS.md`](./AGENTS.md) — Frontend-specific AI directives (Next.js 16, React 19, Tailwind v4, 4-state UI).
- [`AGENTS.md`](../AGENTS.md) — Master Repository AI Operating Manual.

