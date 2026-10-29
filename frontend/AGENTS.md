<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Frontend AI Agent Guidelines (Next.js 16 + React 19 + Tailwind CSS 4)

This file contains dedicated guidelines for AI Agents working within the `frontend/` directory of the **Relay Task Management Engine**.

For full project context and non-negotiables, see [Root AGENTS.md](../AGENTS.md).

---

## 1. Next.js 16 & React 19 Architectural Directives

- **Turbopack & App Router:** All routing is under `src/app/`. Use standard Next.js 16 App Router paradigms.
- **Client Components (`'use client';`):**
  - Always mark components utilizing React hooks (`useState`, `useEffect`, `useCallback`, `useTransition`), Zustand stores, or TanStack Query with `'use client';` at the very top.
  - Keep client component trees small and push static content to Server Components where applicable.
- **Async Request APIs:**
  - Note that in Next.js 16, dynamic route params (`params`) and search query params (`searchParams`) in page props are Promises and must be awaited if accessed asynchronously in server components.
- **React 19 Conventions:**
  - Do not use deprecated React lifecycle methods or outdated patterns (e.g., `defaultProps` on function components).
  - Use React 19 modern hooks and ref forwarding patterns.

---

## 2. Styling Directives (Tailwind CSS v4)

- **Tailwind v4 Setup:**
  - Configured via `@tailwindcss/postcss` in `postcss.config.mjs` and `@import "tailwindcss";` in `src/app/globals.css`.
  - Do **NOT** create or look for a legacy `tailwind.config.js` or `tailwind.config.ts`.
  - Custom design tokens, keyframes, and themes are declared in CSS using `@theme` blocks.
- **Class Merging Utility:**
  - Always use the `cn(...)` utility function from [`src/lib/utils.ts`](./src/lib/utils.ts) when merging conditional classes to prevent specificity collisions.

---

## 3. UI States & User Experience Guardrails

- **Mandatory 4 UI States on Every Async View:**
  1. `Loading`: Render `<LoadingState />` or skeleton shimmer widgets. Never leave the screen completely blank during fetch.
  2. `Success`: Render populated data widgets, tables, or boards.
  3. `Empty`: Render `<EmptyState />` with a helpful explanation and a clear Call-To-Action (CTA) button.
  4. `Error`: Render `<ErrorState />` with a human-readable error message and an action button to retry.
- **Optimistic Concurrency Resolution (HTTP 409):**
  - When mutations fail with status `409 Conflict`, always trigger `useTaskStore.getState().openConflictModal(taskId)` or pass the conflict handler. Do not swallow 409 errors.
- **Search Inputs:**
  - Always wrap live text search filters in a `debounce` (300ms) to avoid spamming the backend API.

---

## 4. State Management Conventions

- **Server Cache & Async Data (TanStack Query v5):**
  - Use `useQuery` and `useMutation` for all server-originating data.
  - Canonical query keys:
    - `['project-board', projectId]` — Project Kanban board and deliverables.
    - `['tasks', filters]` — Deliverables table view.
    - `['projects']` — Project selector and active workspaces.
    - `['archived-projects']` — Archived projects modal.
    - `['standup-summary', projectId]` — Daily Standup report.
    - `['users', filters]` — Super Admin user management table.
  - After mutations, invalidate corresponding queries via `queryClient.invalidateQueries(...)`.
- **Client UI State (Zustand v5):**
  - Use `useAuthStore` for authenticated user profile, token state, and logout.
  - Use `useTaskStore` for active modal toggles (`isCreateTaskOpen`, `isConflictModalOpen`, `selectedTaskId`).

---

## 5. Verification Commands for AI Agents

Run these commands before finishing frontend work:
```bash
npm run lint             # Check Biome linter & formatting
npm run format           # Auto-format files
npx tsc --noEmit         # Full TypeScript compilation check
npm test                 # Run frontend unit tests (query builder & utils)
npm run build            # Verify Next.js production build bundle
```
