import { Department, PrismaClient, Role, TaskStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Database Seeding ---');

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.taskAttachment.deleteMany();
  await prisma.taskDependency.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectClient.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  const defaultPassword = await bcrypt.hash('Password123!', 10);

  // 1. Create Users
  const _superAdminUser = await prisma.user.create({
    data: {
      email: 'admin@relay.id',
      password: defaultPassword,
      name: 'Alexander Roy (Super Admin)',
      role: Role.SUPER_ADMIN,
      department: Department.MANAGEMENT,
      avatar_url:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    },
  });

  const pmUser = await prisma.user.create({
    data: {
      email: 'pm@relay.id',
      password: defaultPassword,
      name: 'Sarah Pratama (PM)',
      role: Role.PRODUCT_MANAGER,
      department: Department.PRODUCT,
      avatar_url:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    },
  });

  const uiuxUser = await prisma.user.create({
    data: {
      email: 'uiux@relay.id',
      password: defaultPassword,
      name: 'Budi Santoso (UI/UX)',
      role: Role.INTERNAL_TEAM,
      department: Department.UI_UX,
      avatar_url:
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    },
  });

  const beUser = await prisma.user.create({
    data: {
      email: 'be@relay.id',
      password: defaultPassword,
      name: 'Rian Hidayat (Backend)',
      role: Role.INTERNAL_TEAM,
      department: Department.BACKEND,
      avatar_url:
        'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
    },
  });

  const feUser = await prisma.user.create({
    data: {
      email: 'fe@relay.id',
      password: defaultPassword,
      name: 'Dimas Anggara (Frontend)',
      role: Role.INTERNAL_TEAM,
      department: Department.FRONTEND,
      avatar_url:
        'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=150',
    },
  });

  const clientUser = await prisma.user.create({
    data: {
      email: 'client@client.com',
      password: defaultPassword,
      name: 'John Client (Guest)',
      role: Role.CLIENT_GUEST,
      department: Department.EXTERNAL,
      avatar_url:
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    },
  });

  console.log(
    'Seeded Users: Super Admin, PM, UI/UX, Backend, Frontend, Client Guest',
  );

  // 2. Create Projects
  const project1 = await prisma.project.create({
    data: {
      name: 'Enterprise Commerce Platform',
      description:
        'High-value omnichannel enterprise commerce portal with multi-region support.',
    },
  });

  // Assign Client Guest to Project 1 only (Multi-tenant isolation)
  await prisma.projectClient.create({
    data: {
      project_id: project1.id,
      user_id: clientUser.id,
    },
  });

  // Assign Internal Team Members (UI/UX, BE, FE) to Project 1 (ABAC isolation)
  await prisma.projectMember.createMany({
    data: [
      { project_id: project1.id, user_id: uiuxUser.id },
      { project_id: project1.id, user_id: beUser.id },
      { project_id: project1.id, user_id: feUser.id },
    ],
  });

  console.log(
    'Seeded Projects, Client Project mapping, and Internal Team Project Memberships',
  );

  // 3. Create Tasks for Project 1
  // Task A: UI Design (Completed)
  const taskA = await prisma.task.create({
    data: {
      project_id: project1.id,
      assignee_id: uiuxUser.id,
      title: 'Task A: UI/UX High-Fidelity Design System',
      description:
        'Create Figma design system components, typography tokens, and responsive layouts.',
      status: TaskStatus.DONE,
      department: Department.UI_UX,
      client_visible: true,
      version: 2,
      due_date: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
    },
  });

  // Task B: Backend API (In Progress)
  const taskB = await prisma.task.create({
    data: {
      project_id: project1.id,
      assignee_id: beUser.id,
      title: 'Task B: Core API & Database Engine Integration',
      description:
        'Develop Express endpoints, Prisma database schema, and JWT authentication filters.',
      status: TaskStatus.IN_PROGRESS,
      department: Department.BACKEND,
      client_visible: true,
      version: 1,
      due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // In 2 days
    },
  });

  // Task C: Frontend Slicing (Depends on A & B -> Currently BLOCKED because B is not DONE)
  const taskC = await prisma.task.create({
    data: {
      project_id: project1.id,
      assignee_id: feUser.id,
      title: 'Task C: Frontend Slicing & API Integration',
      description:
        'Build Next.js client components, hook up TanStack Query, and enforce form validations.',
      status: TaskStatus.TODO,
      department: Department.FRONTEND,
      client_visible: true,
      version: 1,
      due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    },
  });

  // Task D: Internal PM Architecture Specs (Client Visible = false, internal only)
  const _taskD = await prisma.task.create({
    data: {
      project_id: project1.id,
      assignee_id: pmUser.id,
      title: 'Task D: Internal Roadmap & Security Hardening Specs',
      description:
        'Confidential strategic pricing review, vendor evaluation, and audit scope.',
      status: TaskStatus.IN_PROGRESS,
      department: Department.PRODUCT,
      client_visible: false,
      version: 1,
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  // Task E: Client Reporting Setup
  const _taskE = await prisma.task.create({
    data: {
      project_id: project1.id,
      assignee_id: feUser.id,
      title: 'Task E: Client Guest Analytics Widget',
      description:
        'Clean aggregate metrics widget for external client stakeholders.',
      status: TaskStatus.TODO,
      department: Department.FRONTEND,
      client_visible: true,
      version: 1,
      due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    },
  });

  // 4. Create Task Dependencies
  // Task C depends on Task A (DONE) and Task B (IN_PROGRESS)
  await prisma.taskDependency.create({
    data: {
      task_id: taskC.id,
      prerequisite_id: taskA.id,
    },
  });

  await prisma.taskDependency.create({
    data: {
      task_id: taskC.id,
      prerequisite_id: taskB.id,
    },
  });

  console.log(
    'Seeded Task Dependencies: Task C depends on Task A and Task B (BLOCKED scenario)',
  );

  // 5. Seed Initial Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        task_id: taskA.id,
        user_id: uiuxUser.id,
        changed_column: 'status',
        old_value: 'IN_PROGRESS',
        new_value: 'DONE',
        created_at: new Date(Date.now() - 18 * 60 * 60 * 1000),
      },
      {
        task_id: taskB.id,
        user_id: beUser.id,
        changed_column: 'status',
        old_value: 'TODO',
        new_value: 'IN_PROGRESS',
        created_at: new Date(Date.now() - 12 * 60 * 60 * 1000),
      },
    ],
  });

  console.log('--- Database Seeding Completed Successfully ---');
}

export { main as seedDatabase };

main()
  .catch((e) => {
    console.error('Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
