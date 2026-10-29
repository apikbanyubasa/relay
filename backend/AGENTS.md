# Backend AI Agent Guidelines (Express 5 + Prisma 6 + PostgreSQL 17)

This file contains dedicated guidelines for AI Agents working within the `backend/` directory of the **Relay Task Management Engine**.

For full project context and non-negotiables, see [Root AGENTS.md](../AGENTS.md).

---

## 1. Express 5 & Node.js ESM Directives

- **Express 5 Native Async Handling:**
  - Express 5 automatically catches rejected promises in route handlers and middleware and passes them to the global error middleware. You do not need third-party async error wrappers.
- **ES Modules (`"type": "module"`):**
  - **Mandatory:** All relative local file imports MUST include the `.js` extension, even in TypeScript source files:
    ```typescript
    // Correct:
    import { env } from '../config/env.js';
    import { prisma } from '../config/prisma.js';
    import { sendError, sendSuccess } from '../utils/response.js';

    // Incorrect (will fail at runtime):
    import { env } from '../config/env';
    ```
- **Error Handling & Response Contract:**
  - Throw custom `TaskServiceError(message, statusCode, code)` for domain errors.
  - Global error handler in [`src/index.ts`](./src/index.ts) catches errors and formats them into `{ success: false, error: { code, message, details } }`.
  - Use `sendSuccess(res, data, meta, statusCode)` for all successful responses.

---

## 2. Prisma 6 Database & Transaction Invariants

- **Atomic Transactions (`prisma.$transaction`):**
  - Any multi-step mutation (e.g., updating a task and creating an `AuditLog`, soft-deleting a project and cascading to tasks, or adding dependencies) MUST be wrapped inside a `prisma.$transaction`.
- **Soft Delete Protocol:**
  - Relay uses soft deletes (`deleted_at TIMESTAMP NULL`).
  - **Always** filter active records with `where: { deleted_at: null }`.
  - To delete, set `deleted_at: new Date()`. Never call `delete()` or `deleteMany()` unless deliberately purging in a hard cleanup script.
- **Optimistic Concurrency Control (OCC):**
  - When updating a task, always perform a conditional update matching the client-supplied `version` and incrementing it:
    ```typescript
    const result = await tx.task.updateMany({
      where: { id: taskId, version: data.version, deleted_at: null },
      data: { ...data, version: { increment: 1 } },
    });
    if (result.count === 0) {
      throw new TaskServiceError('Concurrency conflict: Task was updated by another user.', 409, 'CONFLICT');
    }
    ```

---

## 3. Deterministic Governance & Security Rules

- **State-Based RBAC Enforcement:**
  - **Completion Rule:** A transition from `IN_PROGRESS` to `DONE` is strictly reserved for the task's assigned executor (`task.assignee_id === user.id`). If a manager or admin attempts this transition, throw HTTP 403 `FORBIDDEN_STATUS_TRANSITION`.
  - **Reopen Rule:** Transitioning a task from `DONE` back to `IN_PROGRESS` is strictly reserved for `PRODUCT_MANAGER` and `SUPER_ADMIN`.
  - **Immutability for Engineers:** Users with role `INTERNAL_TEAM` cannot edit task `title`, `description`, `assignee_id`, `due_date`, or `client_visible`.
- **DAG-Based Dependency Rules:**
  - **Blocking:** If any prerequisite task is not in `DONE` status, the dependent task cannot transition to `IN_PROGRESS` or `DONE`. Throw HTTP 422 `TASK_BLOCKED`.
  - **Cycle Prevention:** Before adding a dependency ($A \rightarrow B$), run `wouldCreateCycle(taskId, prerequisiteId)` via BFS/DFS traversal. If a loop is detected, throw HTTP 400 `CIRCULAR_DEPENDENCY`.
- **Client Guest Masking:**
  - For `CLIENT_GUEST` requests:
    - Filter tasks by `client_visible: true` at the database query level.
    - Run remaining tasks through `TaskService.maskTaskForClient` to scrub internal engineer identities (`assignee.name = "Assigned Specialist"`, email and avatar set to null, internal dependencies stripped).

---

## 4. Query Engine (ezfilter) & Whitelisting

When using `buildPrismaQuery` in [`src/utils/ezfilter.helper.ts`](./src/utils/ezfilter.helper.ts):
- Always define explicit `ALLOWED_SEARCH_FIELDS` and `ALLOWED_ORDER_FIELDS` in routes to avoid PostgreSQL errors on enum/date fields and prevent column injection.

---

## 5. Verification Commands for AI Agents

Run these commands before finishing backend work:
```bash
npm run lint             # Check Biome linter & formatting
npm run format           # Auto-format files
npm test                 # Run test_api_flow.ts, test_user_flow.ts, and task.service.test.ts
npm run db:push          # Ensure schema sync if schema.prisma was modified
```
