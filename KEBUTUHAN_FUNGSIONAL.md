# MATRIKS KEBUTUHAN FUNGSIONAL SISTEM (SRS AUDIT RIIL)
## Relay Task Management Engine

Dokumen ini disusun berdasarkan **Audit Riil Kode Sumber** (*Source-Code Deep Scan*) pada seluruh file routing backend Express 5 dan komponen interaktif frontend Next.js 16.

---

## 📊 Ringkasan Statistik Faktual Sistem
- **Total Kebutuhan Fungsional:** **89 Kebutuhan Fungsional**
- **Frontend (Antarmuka & Interaksi Pengguna):** **45 KF**
- **Backend (Endpoint API & Logika Bisnis):** **44 KF**

---

## 🖥️ BAGIAN 1: TABEL KEBUTUHAN FUNGSIONAL FRONTEND (TOTAL: 45 KF)
*Diverifikasi langsung dari file `frontend/src/app/` dan `frontend/src/components/`.*

| Kode | Kebutuhan Fungsional Frontend | Komponen File Asli | Aktor Utama |
| :---: | :--- | :--- | :--- |
| **KF-FE-01** | Menampilkan Halaman Login dan Form Kredensial | `app/login/page.tsx` | Semua Pengunjung |
| **KF-FE-02** | Memvalidasi Format Input Login Sisi Klien (Email & Password Required) | `app/login/page.tsx` | Semua Pengunjung |
| **KF-FE-03** | Menampilkan Indikator Loading (*Authenticating...*) dan Disable Tombol | `app/login/page.tsx` | Semua Pengunjung |
| **KF-FE-04** | Menampilkan Banner Peringatan Kesalahan Login (*Invalid email or password*) | `app/login/page.tsx` | Semua Pengunjung |
| **KF-FE-05** | Mengisi Form Login Otomatis Menggunakan Tombol *Quick Demo Switcher* | `app/login/page.tsx` | Semua Pengunjung |
| **KF-FE-06** | Menampilkan Identitas Pengguna Aktif (Nama, Avatar, Badge Peran) di Navbar | `components/ui/Navbar.tsx` | Semua User Login |
| **KF-FE-07** | Berpindah Antar-Proyek Menggunakan Dropdown Pemilih Proyek (*Project Selector*) | `components/ui/Navbar.tsx` | Semua User Login |
| **KF-FE-08** | Membuka Menu Aksi Workspace (Create, Members, Archive, Restore) | `components/ui/Navbar.tsx` | Semua User Login |
| **KF-FE-09** | Melakukan Logout Akun dari Navbar dan Mengosongkan Sesi Zustand | `components/ui/Navbar.tsx` | Semua User Login |
| **KF-FE-10** | Mengakses Halaman Pengaturan Akun Mandiri (`/settings`) | `app/settings/page.tsx` | Semua User Login |
| **KF-FE-11** | Melihat Informasi Akun Pribadi (Email, Role, Tanggal Bergabung) | `app/settings/page.tsx` | Semua User Login |
| **KF-FE-12** | Mengedit Nama Profil Pribadi dan Menyimpan Perubahan | `app/settings/page.tsx` | Semua User Login |
| **KF-FE-13** | Mengedit URL Foto Avatar dengan Pratinjau Gambar Langsung (*Live Preview*) | `app/settings/page.tsx` | Semua User Login |
| **KF-FE-14** | Mengubah Kata Sandi Pribadi dengan Verifikasi Password Lama dan Baru | `app/settings/page.tsx` | Semua User Login |
| **KF-FE-15** | Beralih Visibilitas Teks Kata Sandi (*Show/Hide Password Toggle*) | `app/settings/page.tsx` | Semua User Login |
| **KF-FE-16** | Mengakses Portal Tata Kelola Anggota Tim (`/admin/users`) | `app/admin/users/page.tsx` | Super Admin |
| **KF-FE-17** | Menampilkan Kartu Metrik Ringkasan Pengguna (Total, Admin, PM, Team, Client) | `app/admin/users/page.tsx` | Super Admin |
| **KF-FE-18** | Mencari Data Pengguna Secara Real-time dengan Jeda *Debounce* 300ms | `app/admin/users/page.tsx` | Super Admin |
| **KF-FE-19** | Menyaring Data Pengguna Berdasarkan Dropdown Role dan Departemen | `app/admin/users/page.tsx` | Super Admin |
| **KF-FE-20** | Menampilkan Tabel Anggota Tim Beserta Beban Kerja (*Workload Chips*) | `app/admin/users/page.tsx` | Super Admin |
| **KF-FE-21** | Menambah Pengguna Baru via Modal Formulir (*Create User Modal*) | `app/admin/users/page.tsx` | Super Admin |
| **KF-FE-22** | Mengedit Profil, Peran, dan Departemen Pengguna via Modal Edit | `app/admin/users/page.tsx` | Super Admin |
| **KF-FE-23** | Mereset Kata Sandi Pengguna Tim via Modal Admin Reset Password | `app/admin/users/page.tsx` | Super Admin |
| **KF-FE-24** | Menonaktifkan Akun Pengguna (*Soft Delete*) via Dialog Konfirmasi | `app/admin/users/page.tsx` | Super Admin |
| **KF-FE-25** | Menampilkan Peringatan Larangan Hapus Akun Sendiri (*Self-Delete Guard*) | `app/admin/users/page.tsx` | Super Admin |
| **KF-FE-26** | Membuat Proyek Baru Melalui Modal *CreateProjectModal* | `components/board/CreateProjectModal.tsx` | Super Admin, PM |
| **KF-FE-27** | Melihat Daftar Anggota Tim yang Tergabung dalam Proyek Aktif | `components/board/ProjectMembersModal.tsx` | Super Admin, PM |
| **KF-FE-28** | Menambah dan Menghapus Anggota Tim dari Proyek Aktif | `components/board/ProjectMembersModal.tsx` | Super Admin, PM |
| **KF-FE-29** | Menambah dan Menghapus Akses Klien Guest pada Proyek Aktif | `components/board/ProjectMembersModal.tsx` | Super Admin, PM |
| **KF-FE-30** | Mengarsipkan Proyek Aktif (*Archive*) Melalui Dialog SweetAlert2 | `components/ui/Navbar.tsx` | Super Admin, PM |
| **KF-FE-31** | Melihat Daftar Proyek Terarsip Melalui Modal *ArchivedProjectsModal* | `components/board/ArchivedProjectsModal.tsx` | Super Admin, PM |
| **KF-FE-32** | Memulihkan (*Restore*) Proyek Terarsip Beserta Seluruh Deliverable Anak | `components/board/ArchivedProjectsModal.tsx` | Super Admin, PM |
| **KF-FE-33** | Beralih Antara Mode Papan Kanban dan Mode Tabel Data (*View Switcher*) | `app/page.tsx` | Semua User Login |
| **KF-FE-34** | Menyaring Deliverable Personal Menggunakan Tombol *"My Tasks"* | `app/page.tsx` | Tim Internal |
| **KF-FE-35** | Menampilkan Papan Kanban 4 Kolom Status (TODO, PROGRESS, REVIEW, DONE) | `components/board/KanbanColumn.tsx` | Semua User Login |
| **KF-FE-36** | Menampilkan Kartu Deliverable dengan Badge Prioritas, Dept, dan Assignee | `components/board/TaskCard.tsx` | Semua User Login |
| **KF-FE-37** | Menampilkan Penanda Tugas Terkunci (*BLOCKED Badge*) dan Tooltip Info | `components/board/TaskCard.tsx` | Semua User Login |
| **KF-FE-38** | Menambah Deliverable Baru Melalui Formulir Modal *CreateTaskModal* | `components/board/CreateTaskModal.tsx` | Super Admin, PM |
| **KF-FE-39** | Mencari Substring Judul dan Deskripsi pada Tabel Deliverable `ezfilter` | `components/board/DeliverablesTableView.tsx` | Semua User Login |
| **KF-FE-40** | Menyaring Baris Tabel Deliverable Berdasarkan Pilihan Departemen | `components/board/DeliverablesTableView.tsx` | Semua User Login |
| **KF-FE-41** | Mengurutkan Kolom Tabel Deliverable (*Multi-Column Sorting*) | `components/board/DeliverablesTableView.tsx` | Semua User Login |
| **KF-FE-42** | Menavigasi Paginasi Server-Side Tabel Deliverable (First, Prev, Next, Last) | `components/board/DeliverablesTableView.tsx` | Semua User Login |
| **KF-FE-43** | Membuka Rincian Lengkap Task (Tab Overview, Deps, Audit, Attachments) | `components/board/TaskDetailModal.tsx` | Semua User Login |
| **KF-FE-44** | Menampilkan Dialog Tabrakan Versi Data (*ConflictModal* saat HTTP 409) | `components/ui/ConflictModal.tsx` | Semua User Login |
| **KF-FE-45** | Menampilkan Dashboard Laporan Intelijen Daily Standup 24 Jam (`/standup`) | `app/standup/page.tsx` | Super Admin, PM, Tim |

---

## ⚡ BAGIAN 2: TABEL KEBUTUHAN FUNGSIONAL BACKEND (TOTAL: 44 KF)
*Diverifikasi langsung dari file `backend/src/routes/` dan `backend/src/index.ts`.*

| Kode | Kebutuhan Fungsional Backend | Target Endpoint HTTP | Aktor / Pemanggil |
| :---: | :--- | :--- | :--- |
| **KF-BE-01** | Menyajikan Informasi Status Welcome API Relay Engine | `GET /` | Publik / Monitoring |
| **KF-BE-02** | Memverifikasi Kesehatan Koneksi Database PostgreSQL | `GET /health` | Publik / Monitoring |
| **KF-BE-03** | Mendaftarkan Akun Baru dengan Validasi Schema Zod dan Role/Dept | `POST /api/auth/register` | Klien HTTP |
| **KF-BE-04** | Memvalidasi Kredensial Login dan Verifikasi Hash Kata Sandi `bcryptjs` | `POST /api/auth/login` | Klien HTTP |
| **KF-BE-05** | Menerbitkan Token JWT dan Memasang Cookie `HttpOnly; Secure` | `POST /api/auth/login` | Klien HTTP |
| **KF-BE-06** | Mengambil Data Profil Pengguna Aktif Berdasarkan Token Cookie Sesi | `GET /api/auth/me` | User Terautentikasi |
| **KF-BE-07** | Membersihkan Cookie Sesi `auth_token` untuk Mengakhiri Sesi | `POST /api/auth/logout` | User Terautentikasi |
| **KF-BE-08** | Mengambil Data Profil Mandiri Pengguna Aktif | `GET /api/users/profile` | Semua User Login |
| **KF-BE-09** | Mengedit Nama Tampilan dan URL Avatar Pengguna Pribadi | `PATCH /api/users/profile` | Semua User Login |
| **KF-BE-10** | Mengubah Kata Sandi Mandiri dengan Verifikasi Sandi Lama | `PUT /api/users/change-password` | Semua User Login |
| **KF-BE-11** | Mengambil Daftar Klien Guest yang Tersedia untuk Ditugaskan ke Proyek | `GET /api/users/clients` | Super Admin, PM |
| **KF-BE-12** | Mengambil Daftar Pengguna yang Tersedia Dipilih Sebagai Assignee Deliverable / Anggota Proyek | `GET /api/users/assignees` | Super Admin, PM, Tim |
| **KF-BE-13** | Mengambil Daftar Pengguna Tim (Paginasi, Search, Role, Dept Filter) | `GET /api/users` | Super Admin |
| **KF-BE-14** | Mendaftarkan Pengguna Tim Baru dengan Pengecekan Keunikan Email | `POST /api/users` | Super Admin |
| **KF-BE-15** | Mengambil Rincian Lengkap Data Satu Pengguna Berdasarkan ID | `GET /api/users/:id` | Super Admin |
| **KF-BE-16** | Mengedit Profil, Peran (*Role*), dan Departemen Anggota Tim | `PATCH /api/users/:id` | Super Admin |
| **KF-BE-17** | Menolak Percobaan Hapus Akun Sendiri (*Self-Deletion Guard*) | `DELETE /api/users/:id` | Super Admin |
| **KF-BE-18** | Menolak Hapus/Demote Akun Super Admin Tunggal Terakhir | `DELETE /api/users/:id` | Super Admin |
| **KF-BE-19** | Melakukan Soft-Delete Akun Pengguna (`deleted_at = NOW()`) | `DELETE /api/users/:id` | Super Admin |
| **KF-BE-20** | Mereset Kata Sandi Pengguna Tim oleh Administrator | `POST /api/users/:id/reset-password` | Super Admin |
| **KF-BE-21** | Mengambil Daftar Proyek Aktif Sesuai Batasan Hak Akses Peran | `GET /api/projects` | Semua User Login |
| **KF-BE-22** | Mengambil Daftar Seluruh Proyek yang Berstatus Terarsip | `GET /api/projects/archived` | Super Admin, PM |
| **KF-BE-23** | Mengambil Rincian Lengkap Satu Proyek Berdasarkan ID | `GET /api/projects/:id` | Semua User Login |
| **KF-BE-24** | Mengambil Daftar Anggota Tim yang Tergabung dalam Proyek | `GET /api/projects/:id/members` | Semua User Login |
| **KF-BE-25** | Mendaftarkan Anggota Tim Baru ke Dalam Proyek | `POST /api/projects/:id/members` | Super Admin, PM |
| **KF-BE-26** | Menghapus Keanggotaan Tim dari Proyek Tertentu | `DELETE /api/projects/:id/members/:userId` | Super Admin, PM |
| **KF-BE-27** | Mendaftarkan Klien Guest ke Dalam Proyek Tertentu | `POST /api/projects/:id/clients` | Super Admin, PM |
| **KF-BE-28** | Menghapus Akses Klien Guest dari Proyek Tertentu | `DELETE /api/projects/:id/clients/:userId` | Super Admin, PM |
| **KF-BE-29** | Membuat Proyek Baru dan Auto-Enroll Seluruh Tim Aktif | `POST /api/projects` | Super Admin, PM |
| **KF-BE-30** | Mengedit Informasi Nama dan Deskripsi Proyek | `PATCH /api/projects/:id` | Super Admin, PM |
| **KF-BE-31** | Mengarsipkan Proyek dengan Cascading Soft-Delete ke Semua Task Anak | `DELETE /api/projects/:id` | Super Admin, PM |
| **KF-BE-32** | Memulihkan (*Restore*) Proyek Terarsip Beserta Semua Task Anak | `POST /api/projects/:id/restore` | Super Admin, PM |
| **KF-BE-33** | Mengambil Ringkasan Metrik Deliverables Publik Klien dengan Masking | `GET /api/projects/:id/client-view` | Client Guest |
| **KF-BE-34** | Mengambil Ringkasan Statistik Status Deliverable dalam Proyek | `GET /api/projects/:id/summary` | Semua User Login |
| **KF-BE-35** | Mengambil Data Board Kanban dengan Evaluasi Kunci Blokir Dependensi | `GET /api/projects/:id/board` | Semua User Login |
| **KF-BE-36** | Mem-parsing Query Filter, Substring Search, Sort, dan Paginasi (`ezfilter`) | `GET /api/tasks` | Semua User Login |
| **KF-BE-37** | Mengambil Detail Satu Deliverable Beserta Relasi Dependensi dan Audit | `GET /api/tasks/:id` | Semua User Login |
| **KF-BE-38** | Membuat Deliverable Baru dengan Inisialisasi Versi Awal `version = 1` | `POST /api/tasks` | Super Admin, PM |
| **KF-BE-39** | Memperbarui Deliverable dengan Proteksi Konkurensi Optimistic Locking (409) | `PATCH /api/tasks/:id` | Semua User Login |
| **KF-BE-40** | Mengubah Status Deliverable dengan Validasi Wewenang Status & Blokir DAG | `PATCH /api/tasks/:id/status` | Semua User Login |
| **KF-BE-41** | Melakukan Soft-Delete Deliverable dan Memutus Dependensi Aktif | `DELETE /api/tasks/:id` | Super Admin, PM |
| **KF-BE-42** | Menambah Dependensi Prasyarat dengan Deteksi Siklus Melingkar (BFS) | `POST /api/tasks/:id/dependencies` | Super Admin, PM |
| **KF-BE-43** | Menghapus Hubungan Dependensi Prasyarat Deliverable | `DELETE /api/tasks/:id/dependencies/:prereqId` | Super Admin, PM |
| **KF-BE-44** | Menyimpan Metadata Lampiran Berkas Deliverable (*TaskAttachment*) | `POST /api/tasks/:id/attachments` | Super Admin, PM, Tim |

---

## 🎯 Hubungan Nyata: Dari Kebutuhan Fungsional ke QA Automation

- **Frontend Automated Verification:** Diuji secara otomatis melalui Node Native Test Runner via `tsx --test` (`src/lib/utils.test.ts` & `src/lib/query-builder.test.ts`), linting ketat Biome (`npm run lint`), dan kompilasi tipe TypeScript (`npx tsc --noEmit`).
- **Backend Automated Verification:** Diuji secara menyeluruh melalui integrasi suite Supertest & Node Test Runner (`src/test_api_flow.ts`, `src/test_user_flow.ts`, dan `src/services/task.service.test.ts`) yang memvalidasi siklus penuh autentikasi, DAG blocking, OCC 409 conflict, RBAC status transition, isolasi klien, dan manajemen tim.
- **Total Keseluruhan:** **89 Kebutuhan Fungsional Faktual** yang saling berpasangan secara harmonis di sistem Relay!
