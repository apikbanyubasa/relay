# Relay Task Management Engine

[![Node.js](https://img.shields.io/badge/Node.js-20%2B%20%2F%2022%20LTS-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.3-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.4-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Biome](https://img.shields.io/badge/Linter-Biome_2.4-60A5FA?logo=biome&logoColor=white)](https://biomejs.dev/)

**Relay Task Management Engine** adalah platform orkestrasi deliverable proyek enterprise yang mengusung prinsip **Deterministic Workflow Governance**. Dibangun untuk menjamin integritas data dan koordinasi kerja lintas fungsi (*Management, Product, UI/UX, Frontend, Backend*) serta kolaborasi dengan pemangku kepentingan luar (*Client Guests*).

---

## 🏗️ Tech Stack Overview

### Backend (`/backend`)
- **Runtime:** Node.js 20+ / 22 LTS (ES Modules)
- **Framework:** Express.js 5 (`express: ^5.3.0`)
- **Language:** TypeScript 5.8 (Strict mode)
- **Database:** PostgreSQL 17 Alpine (via Docker Compose)
- **ORM:** Prisma ORM 6 (`@prisma/client: ^6.4.1`)
- **Query Engine:** Relay `ezfilter` (substring search, exact match, multi-column sorting, pagination)
- **Validation:** Zod 4.6 (Runtime Zero-Trust Schema Validation)
- **Auth:** JWT (`jsonwebtoken`) + `HttpOnly; SameSite=Lax/None; Secure` Cookies + `bcryptjs`
- **Testing:** Node Native Test Runner via `tsx --test` + Supertest 7.3
- **Tooling:** Biome 2.4.2, Husky 9, Commitlint

### Frontend (`/frontend`)
- **Framework:** Next.js 16 (App Router, Turbopack)
- **UI Library:** React 19 (`react: 19.2.8`)
- **Styling:** Tailwind CSS v4 (`@tailwindcss/postcss`)
- **Primitives:** Radix UI (Dialog, Dropdown Menu, Select, Tabs)
- **Icons:** Lucide React (`lucide-react`)
- **State Management:**
  - Client state: Zustand 5 (Auth & UI Modals)
  - Server state: TanStack Query v5 (`@tanstack/react-query`)
- **Forms & Validation:** React Hook Form + `@hookform/resolvers` + Zod
- **HTTP Client:** Axios with `withCredentials: true`
- **Alerts:** SweetAlert2
- **Tooling:** Biome 2.4.2, Husky 9, Commitlint

---

## ⚡ Key Architectural Capabilities

1. **DAG-Based Dependency Locking (Directed Acyclic Graph):**
   - Menghalangi tugas dikerjakan (`IN_PROGRESS` / `DONE`) jika prasyaratnya belum `DONE` (HTTP 422 `TASK_BLOCKED`).
   - Deteksi siklus melingkar ($A \rightarrow B \rightarrow A$) via BFS/DFS (HTTP 400 `CIRCULAR_DEPENDENCY`).
2. **True Optimistic Concurrency Control (OCC - HTTP 409):**
   - Atomic conditional update berbasis kolom `version`. Menolak *lost-updates* dengan HTTP 409 Conflict dan dialog rekonsiliasi frontend (`ConflictModal`).
3. **State-Based RBAC/ABAC:**
   - Transisi ke `DONE` hanya boleh dilakukan oleh **Assignee** pelaksana tugas.
   - Fitur **Reopen** (dari `DONE` kembali ke `IN_PROGRESS`) dikunci khusus **Product Manager** dan **Super Admin**.
   - Insinyur dilarang mengedit judul, deskripsi, assignee, tenggat waktu, atau visibilitas klien.
4. **Client Guest Isolation & Strict Data Masking:**
   - Multi-tenant client isolation: Klien hanya melihat proyek yang terhubung dengannya.
   - Task `client_visible: false` difilter langsung di tingkat database.
   - Identitas insinyur internal disamarkan menjadi `Assigned Specialist` / `Assigned Engineer`.
5. **Daily Standup Intelligence (24h Rolling Window):**
   - Agregasi audit log 24 jam otomatis: *Completed Yesterday* dan *Blocked Today* per departemen.
6. **Enterprise Team Governance & Workspace Lifecycle:**
   - Super Admin user CRUD, reset password tim, dan perlindungan Super Admin terakhir.
   - Soft-delete proyek bersarang (*cascading archive*) & 1-click restore (*ArchivedProjectsModal*).

---

## 🚀 Quick Start Guide

### 1. Prasyarat
- **Node.js:** Versi 20+ atau 22 LTS
- **Docker & Docker Compose** (opsional untuk menjalankan PostgreSQL lokal)

### 2. Jalankan Database (Docker)
```bash
cd backend
docker-compose up postgres -d
```
*Port PostgreSQL: `5432` (User: `postgres`, Password: `postgrespassword`, DB: `relay_task_db`)*

### 3. Setup & Jalankan Backend
```bash
cd backend
npm install
npm run db:push
npm run db:seed
npm run dev
```
*Backend API aktif di `http://localhost:4000`*

### 4. Setup & Jalankan Frontend
```bash
cd frontend
npm install
npm run dev
```
*Frontend aktif di `http://localhost:3000`*

---

## 🧪 Pengujian Otomatis (Automated Testing)

### Backend Tests
```bash
cd backend
npm test
```
Menjalankan:
1. `src/test_api_flow.ts` (Integrasi Auth, ezfilter, RBAC, DAG blocking, OCC 409 conflict, Client Guest isolation)
2. `src/test_user_flow.ts` (User Management CRUD, Admin password reset, Safety guards)
3. `src/services/task.service.test.ts` (Unit test logika task service)

### Frontend Tests & Type Checking
```bash
cd frontend
npm test
npm run lint
npx tsc --noEmit
```

---

## 👥 Akun Uji Coba (Seeded Credentials)

Login URL: `http://localhost:3000/login`

| Role | Departemen | Email | Kata Sandi | Wewenang Utama |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | Management | `admin@relay.id` | `Password123!` | User CRUD, team password reset, project archive/restore, full access |
| **Product Manager** | Product | `pm@relay.id` | `Password123!` | Create deliverables, set dependencies, reopen tasks, manage visibility |
| **UI/UX Designer** | UI/UX | `uiux@relay.id` | `Password123!` | Execute design deliverables, complete tasks as assignee |
| **Backend Engineer** | Backend | `be@relay.id` | `Password123!` | Execute API deliverables, complete tasks as assignee |
| **Frontend Engineer** | Frontend | `fe@relay.id` | `Password123!` | Execute UI deliverables, complete tasks as assignee |
| **Client Guest** | External | `client@client.com` | `Password123!` | Read-only view deliverable publik dengan identitas tim internal disamarkan |

---

## 📚 Dokumentasi Terkait
- [AGENTS.md](./AGENTS.md) — Panduan lengkap dan aturan ketat untuk AI Coding Agents.
- [PRD.md](./PRD.md) — Product Requirements Document komprehensif.
- [DOKUMENTASI_PROYEK.md](./DOKUMENTASI_PROYEK.md) — Dokumentasi arsitektur sistem, ERD, dan pipeline kode.
- [KEBUTUHAN_FUNGSIONAL.md](./KEBUTUHAN_FUNGSIONAL.md) — Matriks spesifikasi kebutuhan fungsional & pengujian sistem.
