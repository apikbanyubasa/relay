# Relay Task Management Engine - Backend API

Enterprise Operational Backbone for High-Value Project Deliverables.

## Tech Stack
- **Runtime:** Node.js (v20+ / 22 LTS)
- **HTTP Framework:** Express (v5.3)
- **Language:** TypeScript 5.8 (Strict)
- **Database:** PostgreSQL 17 Alpine (via Docker Compose)
- **ORM:** Prisma 6.4
- **Auth:** JWT (`jsonwebtoken`) with `HttpOnly; SameSite=Lax/None; Secure` Cookies & Bearer Tokens
- **Query Engine:** Relay ezfilter Query Engine (Advanced filtering, substring search, pagination, multi-column sorting)
- **Validation:** Zod 4.6 (Runtime Zero-Trust Schema Validation)
- **Testing:** Supertest 7.3 + Node Test Runner
- **Code Quality:** Biome 2.4.2 + Husky + Commitlint (Conventional Commits)

## Key Architectural & Functional Highlights
1. **Super Admin & Team Governance (`/api/users`)**:
   - Super Admin user lifecycle management: List users with search, role filter, department filter, and pagination.
   - Create user, update user, admin password reset, and soft-delete user.
   - Safeguards: Prevents self-deletion and prevents deleting/demoting the last active Super Admin.
2. **Self-Service Profile & Security (`/api/users/profile`)**:
   - User profile retrieval and self-update (name, avatar URL).
   - Self-service password change with old password verification.
3. **Workspace Management & Cascade Soft-Delete / Restore (`/api/projects`)**:
   - Create project with auto-enrollment of active internal team members and optional initial client assignment.
   - Project members & client management (`/api/projects/:id/members`, `/api/projects/:id/clients`) for managing internal squads and external client stakeholder access.
   - Project soft-delete (`DELETE /api/projects/:id`) cascading to child deliverables.
   - Project restoration (`POST /api/projects/:id/restore`) restoring project and deliverables atomically.
   - List archived projects (`GET /api/projects/archived`).
4. **State-Based RBAC/ABAC Enforcement**:
   - Managers (PM & Super Admin) cannot complete tasks from `IN_PROGRESS` to `DONE` (strictly reserved for the assigned executor).
   - Reopen constraint: Only Product Managers and Super Admins can reopen a `DONE` task back to `IN_PROGRESS`.
   - Internal Engineers can only view/edit tasks within their assigned projects and cannot alter core task descriptions, titles, assignees, due dates, or client visibility.
5. **Inter-Task Dependencies (DAG Engine)**:
   - Tasks with unfinished prerequisites are automatically locked in `BLOCKED` state.
   - Circular dependencies ($A \rightarrow B \rightarrow A$) are strictly prevented using graph traversal cycle detection (DFS/BFS).
   - Cross-project dependencies are prohibited.
6. **True Optimistic Concurrency Control (OCC - HTTP 409)**:
   - Atomic database update matching current `version` and incrementing by 1.
   - Stale concurrent writes are rejected with **HTTP 409 Conflict**.
7. **Client Guest Multi-Tenant Isolation & Backend Masking**:
   - Clients only access projects explicitly mapped to them in `ProjectClient`.
   - Tasks not flagged with `client_visible: true` are filtered out at the database layer.
   - All internal engineering identities (names, avatars, emails, departments) are sanitized at the serialization layer.
8. **Immutable Audit Trail & Attachments**:
   - Every mutation is atomically recorded in `AuditLog` within `prisma.$transaction`.
   - Task attachment management with file size and URL metadata.
9. **Daily Standup Auto-Summary**:
   - Endpoint `/api/reports/standup-summary` aggregates 24h audit logs into "Completed Yesterday" and "Blocked Today" per department.

## Getting Started

### 1. Prerequisites
- Node.js 20+ / 22 LTS
- PostgreSQL database running locally or remotely

### 2. Environment Setup
Copy `.env.example` to `.env` and fill the variables:
```bash
cp .env.example .env
```
Key variables:
- `PORT=4000`
- `DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5432/relay_task_db?schema=public`
- `JWT_SECRET=your_super_secret_jwt_key`
- `CORS_ORIGIN=http://localhost:3000`

### 3. Database Migration & Seeding
```bash
npm run db:push
npm run db:seed
```

### 4. Running the Dev Server
```bash
npm run dev
```
Server runs on `http://localhost:4000`.

### 5. Running Automated Verification Suite
```bash
npm test
```
Executes:
1. `src/test_api_flow.ts`: Comprehensive API test for Health, Auth, ezfilter Query, RBAC status transitions, DAG blocking, OCC 409 conflict, and Client Guest isolation.
2. `src/test_user_flow.ts`: User Management CRUD, Self-service profile update, Admin password reset, and Super Admin safety guards.
3. `src/services/task.service.test.ts`: Unit test suite for task service logic.

## Seeded User Credentials
| Role | Department | Email | Password | Primary Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | Management | `admin@relay.id` | `Password123!` | User CRUD, team password reset, project archive/restore, full access |
| **Product Manager** | Product | `pm@relay.id` | `Password123!` | Create deliverables, set dependencies, reopen tasks, manage visibility |
| **UI/UX Designer** | UI/UX | `uiux@relay.id` | `Password123!` | Execute design tasks, complete tasks as assignee, upload attachments |
| **Backend Engineer** | Backend | `be@relay.id` | `Password123!` | Execute API tasks, complete tasks as assignee, upload attachments |
| **Frontend Engineer** | Frontend | `fe@relay.id` | `Password123!` | Execute UI tasks, complete tasks as assignee, upload attachments |
| **Client Guest** | External | `client@client.com` | `Password123!` | Read-only access to client-visible deliverables with masked identities |

---

## 🤖 AI Agent Guidelines
For instructions, coding invariants, and architectural rules for AI Coding Agents, refer to:
- [`backend/AGENTS.md`](./AGENTS.md) — Backend-specific AI directives.
- [`AGENTS.md`](../AGENTS.md) — Master Repository AI Operating Manual.

