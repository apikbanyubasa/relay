# Claude Code & AI Assistant Directives

All AI coding assistants (including Claude Code, Antigravity, Cursor, and Windsurf) MUST follow the master instructions defined in:
@AGENTS.md

### Quick Context:
- **Project:** Relay Task Management Engine (Enterprise Deterministic Workflow Governance)
- **Backend:** Node.js 20+ / Express 5.3 / TypeScript 5.8 / PostgreSQL 17 / Prisma 6.4 / Zod 4.6
- **Frontend:** Next.js 16.3 / React 19.2 / Tailwind CSS 4 / Radix UI / TanStack Query 5 / Zustand 5
- **Key Invariants:**
  1. Never bypass OCC `version` increment on task mutation (HTTP 409 Conflict).
  2. Never allow non-assignees to complete tasks to `DONE` (State-based RBAC).
  3. Never query without checking `deleted_at: null` (Soft-delete architecture).
  4. Always maintain the 4 UI states on asynchronous views (Loading, Success, Empty, Error).
  5. Always ensure backend tests pass: `cd backend && npm test`.
