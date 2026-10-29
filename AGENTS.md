# AGENTS.md — AI Agent Operating Manual & Engineering Directive

Welcome, AI Coding Agent. This document is your **authoritative instruction manual** when analyzing, modifying, debugging, or extending the **Relay Task Management Engine** codebase.

Strictly adhere to the architectural decisions, security boundaries, and code standards defined herein.

---

## 1. Executive System Philosophy: Deterministic Workflow Governance

Relay is **not** a generic to-do app. It is an **Enterprise Project Deliverables Orchestration Engine** designed around deterministic governance:
1. **DAG-Based Dependency Locking:** Tasks cannot be started or completed unless all prerequisite tasks are in `DONE` status. Circular dependencies ($A \rightarrow B \rightarrow A$) are prevented via graph cycle detection (DFS/BFS).
2. **State-Based RBAC/ABAC:** Business logic strictly limits status transitions:
   - **Only the assigned executor** can transition a task from `IN_PROGRESS` to `DONE`. Managers (Product Manager, Super Admin) are forbidden from completing tasks on behalf of assignees.
   - **Only Product Managers and Super Admins** can reopen a task from `DONE` back to `IN_PROGRESS`.
   - Internal engineers cannot modify task titles, descriptions, assignees, due dates, or client visibility.
3. **True Optimistic Concurrency Control (OCC):** All task mutations require a matching integer `version`. Stale writes are atomically rejected with **HTTP 409 Conflict**, prompting frontend reconciliation via `ConflictModal`.
4. **Client Guest Isolation & Strict Data Masking:** Client users only see projects mapped to them. Non-public deliverables (`client_visible: false`) are filtered at the database level. Internal engineer identities are masked (`Assigned Specialist`).
5. **Daily Standup Intelligence:** Automated rolling 24-hour audit log aggregation (`Completed Yesterday` & `Blocked Today`).
6. **Soft Deletion & Immutable Audit:** Entities are soft-deleted via `deleted_at`. Every state transition produces an atomic `AuditLog` entry within `prisma.$transaction`.

---

## 2. Invariant Rules (NON-NEGOTIABLES FOR AI AGENTS)

When generating or editing code, you **MUST NEVER**:
- ❌ **NEVER bypass OCC versioning:** Never execute an `UPDATE task` without verifying `version: sentVersion` and incrementing `version: { increment: 1 }`.
- ❌ **NEVER bypass Soft Delete:** Never query without `where: { deleted_at: null }` unless explicitly working in an archive/restore recovery handler. Never use `prisma.task.delete()` or `prisma.project.delete()` (always soft-delete via `deleted_at: new Date()`).
- ❌ **NEVER allow unauthorized completion:** Never allow anyone other than `task.assignee_id` to complete a task to `DONE`.
- ❌ **NEVER execute unbounded queries:** Always enforce pagination with `take`/`limit` and `skip`/`offset` (or cursor-based).
- ❌ **NEVER use raw SQL or string concatenation:** Always use Prisma ORM with parameterized queries.
- ❌ **NEVER leak internal credentials or PII:** Never expose internal engineer emails, avatars, or full names to `CLIENT_GUEST` responses.
- ❌ **NEVER use `console.log` in backend production code:** Use structured logging or response error utilities.
- ❌ **NEVER violate the 4 UI States on Frontend:** Every asynchronous view must implement: `Loading` (skeleton/shimmer), `Success` (rendered data), `Empty` (contextual message + CTA), and `Error` (human message + retry button).

---

## 3. Tech Stack & Version Specifications

### Backend (`/backend`)
| Component | Technology | Version | Key Directives |
| :--- | :--- | :--- | :--- |
| **Runtime** | Node.js | v20+ / 22 LTS | ESM (`"type": "module"`). Use `.js` extension on local imports. |
| **Framework** | Express.js | `^5.3.0` (v5) | Take advantage of native Express 5 promise/async error handling. |
| **Language** | TypeScript | `^5.8.2` | Strict mode enabled. |
| **Execution** | `tsx` | `^4.23.0` | Dev runner (`npm run dev` = `tsx watch src/index.ts`). |
| **Database** | PostgreSQL | 17 (Alpine) | Run via `docker-compose up postgres -d`. |
| **ORM** | Prisma | `^6.4.1` | Run `npm run db:push` / `npm run db:seed`. |
| **Auth** | JWT + Cookies | `jsonwebtoken: ^9.0.3` | `HttpOnly; SameSite=Lax/None; Secure` cookies + Bearer auth. |
| **Validation** | Zod | `^4.6.5` | Validate all request bodies, params, and queries. |
| **Code Quality** | Biome | `2.4.2` | Fast formatter & linter (`npm run lint`, `npm run format`). |

### Frontend (`/frontend`)
| Component | Technology | Version | Key Directives |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js | `16.3.6` | App Router (`src/app/`). Turbopack enabled. |
| **UI Engine** | React & DOM | `19.2.8` | React 19 conventions. Use `'use client'` where hooks are used. |
| **Styling** | Tailwind CSS | `^4.0.0` | Tailwind v4 via `@tailwindcss/postcss`. No obsolete `tailwind.config.js`. |
| **Primitives** | Radix UI | Headless | Accessible dialogs, dropdowns, selects, tabs. |
| **Server State** | TanStack Query | `^5.104.0` | React Query v5. Use query keys: `['project-board', projectId]`, `['tasks']`. |
| **Client State** | Zustand | `^5.0.15` | `useAuthStore` and `useTaskStore`. |
| **Forms** | React Hook Form | `^7.89.0` | With `@hookform/resolvers` & Zod. |
| **HTTP** | Axios | `^1.20.0` | `api-client.ts` configured with `withCredentials: true`. |
| **Icons** | Lucide React | `^1.48.0` | Consistent icon set. |
| **Alerts** | SweetAlert2 | `^11.26.25` | Action confirmations and alerts. |

---

## 4. Repository Layout & Architecture Map

```
relay/
├── AGENTS.md                       # (This file) Master Agent Operating Manual
├── README.md                       # Project overview & quickstart
├── PRD.md                          # Comprehensive Product Requirements Document
├── DOKUMENTASI_PROYEK.md           # Deep Indonesian technical architecture guide
│
├── backend/                        # Express 5 + Prisma 6 + TypeScript Backend
│   ├── src/
│   │   ├── index.ts                # Express app bootstrap, CORS, middlewares, error handler
│   │   ├── config/
│   │   │   ├── env.ts              # Zod env variable parsing & validation
│   │   │   └── prisma.ts           # Singleton Prisma client instance
│   │   ├── middlewares/
│   │   │   └── auth.middleware.ts  # JWT verification & role authorization (requireRole)
│   │   ├── routes/
│   │   │   ├── auth.routes.ts      # Auth endpoints (/login, /register, /me, /logout)
│   │   │   ├── user.routes.ts      # Team management (Admin), profile, self-password reset
│   │   │   ├── project.routes.ts   # Project CRUD, archive, restore, board, client metrics
│   │   │   ├── task.routes.ts      # Task CRUD, ezfilter query, dependencies, attachments
│   │   │   ├── report.routes.ts    # Standup summary (24h audit aggregation)
│   │   │   └── audit.routes.ts     # Audit log queries
│   │   ├── services/
│   │   │   ├── task.service.ts     # Core engine: OCC, DAG cycle checks, RBAC transitions
│   │   │   └── task.service.test.ts# Unit tests for task service
│   │   ├── utils/
│   │   │   ├── ezfilter.helper.ts  # Relay Query Engine parser
│   │   │   └── response.ts         # Standardized JSON response envelope
│   │   ├── test_api_flow.ts        # Comprehensive integration verification
│   │   └── test_user_flow.ts       # User lifecycle & security tests
│   ├── prisma/
│   │   ├── schema.prisma           # Relational schema (PostgreSQL)
│   │   └── seed.ts                 # Seeder with default users & project tasks
│   ├── docker-compose.yml          # Postgres 17 container definition
│   └── package.json
│
└── frontend/                       # Next.js 16 + React 19 + Tailwind CSS 4 Frontend
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx          # Root layout with TanStack Query provider & fonts
    │   │   ├── globals.css         # Tailwind v4 import & custom scrollbar
    │   │   ├── page.tsx            # Main workspace: Kanban board & Deliverables table
    │   │   ├── login/page.tsx      # Authentication portal
    │   │   ├── settings/page.tsx   # Self-service profile & password update
    │   │   ├── admin/users/page.tsx# Super Admin team management portal
    │   │   └── standup/page.tsx    # Daily Standup Intelligence dashboard
    │   ├── components/
    │   │   ├── board/              # Kanban, TaskCard, TaskDetailModal, DeliverablesTable, CreateProject
    │   │   ├── client/             # ClientMetricsView (Masked public portal)
    │   │   ├── standup/            # StandupReportView (Completed yesterday, Blocked today)
    │   │   └── ui/                 # ConflictModal (409), Navbar, Loading/Error/Empty states
    │   ├── lib/
    │   │   ├── api-client.ts       # Axios instance with interceptors
    │   │   ├── query-builder.ts    # ezfilter query string generator
    │   │   └── utils.ts            # Class merging (cn) & date/string formatting
    │   ├── store/
    │   │   ├── useAuthStore.ts     # Zustand auth state
    │   │   └── useTaskStore.ts     # Zustand UI/modal state
    │   └── types/                  # Shared TypeScript interfaces
    └── package.json
```

---

## 5. API Response Contracts & Error Envelopes

Every API response from backend must strictly adhere to the standardized response envelope:

### Success Response:
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "totalRows": 100,
    "totalPages": 10,
    "currentPage": 1,
    "rows": 10
  }
}
```

### Error Response:
```json
{
  "success": false,
  "error": {
    "code": "TASK_BLOCKED",
    "message": "Task cannot be started because prerequisite tasks are not completed.",
    "details": ["Setup PostgreSQL Database"]
  }
}
```

### Standard HTTP Status Codes:
- `200 OK`: Successful retrieval or non-creation mutation.
- `201 Created`: Resource successfully created.
- `400 Bad Request`: Validation failure or circular dependency (`CIRCULAR_DEPENDENCY`).
- `401 Unauthorized`: Missing or invalid JWT token.
- `403 Forbidden`: Role permission violation (e.g., manager completing assignee task).
- `404 Not Found`: Entity not found or soft-deleted.
- `409 Conflict`: OCC version mismatch collision (`CONFLICT`).
- `422 Unprocessable Entity`: Business state violation (e.g., `TASK_BLOCKED`).
- `500 Internal Server Error`: Unhandled internal exception.

---

## 6. Critical Engineering Guidelines for Code Editing

### 1. Backend Modifications (`/backend`)
- **Always use `prisma.$transaction`** when performing multi-step operations (e.g., updating a task and creating an `AuditLog` entry, or deleting a project and its child tasks).
- **Import Extensions:** In backend TypeScript files, remember that Node.js ESM requires `.js` file extensions on local imports (e.g., `import { env } from '../config/env.js';`).
- **Prisma Relations:** When writing new relationships in `schema.prisma`, ensure `onDelete: Cascade` or `onDelete: SetNull` is explicitly defined, and add `@@index` on foreign keys and frequently queried fields.
- **Async Errors in Express 5:** Express 5 automatically forwards rejected promises to the global error middleware, but domain errors should throw custom `TaskServiceError(message, statusCode, code)`.

### 2. Frontend Modifications (`/frontend`)
- **Next.js 16 + React 19:**
  - Client components must start with `'use client';`.
  - Avoid using React APIs that were deprecated in React 19.
  - When accessing route params or search params in Next.js 16, note whether they are synchronous or asynchronous Promises based on App Router rules.
- **Tailwind CSS v4:**
  - Use modern Tailwind CSS classes. Configuration is handled in CSS (`@theme`), not via legacy `tailwind.config.js`.
- **4 UI States:**
  - Always render `<LoadingState />`, `<EmptyState />`, `<ErrorState />`, and populated states.
- **Handling OCC 409:**
  - In mutations, catch error `error?.response?.status === 409` and invoke `useTaskStore.getState().openConflictModal(taskId)`.

---

## 7. Development & Verification Commands Cheat Sheet

### Backend Commands:
```bash
cd backend
npm run dev              # Run server with hot reload via tsx watch
npm test                 # Run integration test suites (test_api_flow + test_user_flow + unit tests)
npm run lint             # Check formatting and lint rules via Biome
npm run format           # Auto-format files via Biome
npm run db:push          # Sync Prisma schema to PostgreSQL
npm run db:seed          # Seed test accounts and initial data
```

### Frontend Commands:
```bash
cd frontend
npm run dev              # Run Next.js 16 development server
npm run build            # Verify Next.js production build bundle
npm test                 # Run unit tests via tsx --test
npm run lint             # Check frontend lint rules via Biome
npm run format           # Auto-format frontend files via Biome
npx tsc --noEmit         # Type check all TypeScript files
```

---

## 8. Seeded Test Credentials Reference

| Email | Password | Role | Department | Key Privileges |
| :--- | :--- | :--- | :--- | :--- |
| `admin@relay.id` | `Password123!` | `SUPER_ADMIN` | `MANAGEMENT` | Full administrative control, user CRUD, password reset, archive/restore |
| `pm@relay.id` | `Password123!` | `PRODUCT_MANAGER` | `PRODUCT` | Project & deliverable authoring, DAG dependency management, task reopen |
| `fe@relay.id` | `Password123!` | `INTERNAL_TEAM` | `FRONTEND` | Frontend task execution, complete tasks as assignee |
| `be@relay.id` | `Password123!` | `INTERNAL_TEAM` | `BACKEND` | Backend task execution, complete tasks as assignee |
| `uiux@relay.id` | `Password123!` | `INTERNAL_TEAM` | `UI_UX` | Design task execution, complete tasks as assignee |
| `client@client.com`| `Password123!` | `CLIENT_GUEST` | `EXTERNAL` | Multi-tenant guest view with identity masking |

---

## 9. AI Agent Pre-Flight & Post-Edit Checklist

Before completing any task in this codebase, verify:
- [ ] Has any OCC logic been altered? Ensure `version` checking and incrementing remain intact.
- [ ] Have soft-delete filters (`deleted_at: null`) been preserved on all database reads?
- [ ] Does the frontend preserve the 4 UI states (Loading, Success, Empty, Error)?
- [ ] Does the code pass Biome linting (`npm run lint` in both `frontend` and `backend`)?
- [ ] Do backend integration tests pass (`npm test` in `backend`)?
- [ ] Is TypeScript free of type errors (`npx tsc --noEmit`)?
