# Gemini & Antigravity IDE Directives

All Google Gemini models, Antigravity IDE instances, and subagents MUST strictly adhere to the guidelines set in:
[AGENTS.md](./AGENTS.md)

### Core Rules Checklist for Gemini Agents:
1. **Deterministic Workflow Governance:** Preserve DAG-based task dependency locking and graph cycle checks (BFS/DFS).
2. **True Optimistic Concurrency Control (OCC):** Maintain `version` check and increment on all task updates (`HTTP 409 Conflict`).
3. **State-Based RBAC/ABAC:** Keep the constraint that only the assigned executor can transition a task to `DONE`, and only PM/Super Admin can reopen it.
4. **Data Isolation & Masking:** Ensure `CLIENT_GUEST` responses never leak internal team identities or internal-only tasks (`client_visible: false`).
5. **Code Style & Linting:** Use Biome (`npm run lint` / `npm run format`) and TypeScript strict mode. Node ESM imports must include `.js` extension.
