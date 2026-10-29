import { type Department, Role, TaskStatus } from '@prisma/client';
import { prisma } from '../config/prisma.js';

export class TaskServiceError extends Error {
  statusCode: number;
  code: string;
  details?: any[];

  constructor(
    message: string,
    statusCode: number = 400,
    code: string = 'BAD_REQUEST',
    details?: any[],
  ) {
    super(message);
    this.name = 'TaskServiceError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class TaskService {
  /**
   * Check if a task has unsatisfied dependencies (prerequisites that are not DONE)
   */
  static async checkDependencies(
    taskId: string,
  ): Promise<{ isBlocked: boolean; pendingPrerequisites: string[] }> {
    const dependencies = await prisma.taskDependency.findMany({
      where: { task_id: taskId, deleted_at: null },
      include: {
        prerequisite: {
          select: {
            id: true,
            title: true,
            status: true,
            department: true,
            deleted_at: true,
          },
        },
      },
    });

    const pending = dependencies.filter(
      (dep) =>
        dep.prerequisite.deleted_at !== null ||
        dep.prerequisite.status !== TaskStatus.DONE,
    );

    return {
      isBlocked: pending.length > 0,
      pendingPrerequisites: pending.map((p) =>
        p.prerequisite.deleted_at !== null
          ? `${p.prerequisite.title} (Deleted Prerequisite - Must be removed by PM)`
          : `${p.prerequisite.title} (${p.prerequisite.department} - ${p.prerequisite.status})`,
      ),
    };
  }

  /**
   * Detect circular dependency using DFS
   */
  static async wouldCreateCycle(
    taskId: string,
    prerequisiteId: string,
  ): Promise<boolean> {
    if (taskId === prerequisiteId) return true;

    // Follow prerequisites of prerequisiteId: does any prerequisite eventually lead back to taskId?
    const visited = new Set<string>();
    const queue = [prerequisiteId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === taskId) return true;

      if (!visited.has(current)) {
        visited.add(current);
        const deps = await prisma.taskDependency.findMany({
          where: { task_id: current, deleted_at: null },
          select: { prerequisite_id: true },
        });

        for (const dep of deps) {
          if (!visited.has(dep.prerequisite_id)) {
            queue.push(dep.prerequisite_id);
          }
        }
      }
    }

    return false;
  }

  /**
   * Add a dependency with cycle check and audit log
   */
  static async addDependency(
    taskId: string,
    prerequisiteId: string,
    userId?: string,
  ) {
    if (taskId === prerequisiteId) {
      throw new TaskServiceError(
        'A task cannot depend on itself',
        400,
        'SELF_DEPENDENCY',
      );
    }

    const [targetTask, prereqTask] = await Promise.all([
      prisma.task.findUnique({
        where: { id: taskId },
        select: { project_id: true },
      }),
      prisma.task.findUnique({
        where: { id: prerequisiteId },
        select: { project_id: true },
      }),
    ]);

    if (!targetTask || !prereqTask) {
      throw new TaskServiceError(
        'Task or prerequisite task not found',
        404,
        'NOT_FOUND',
      );
    }

    if (targetTask.project_id !== prereqTask.project_id) {
      throw new TaskServiceError(
        'Cross-project dependencies are not allowed. Both tasks must belong to the same project.',
        400,
        'CROSS_PROJECT_DEPENDENCY',
      );
    }

    const hasCycle = await TaskService.wouldCreateCycle(taskId, prerequisiteId);
    if (hasCycle) {
      throw new TaskServiceError(
        'Circular dependency detected: adding this prerequisite creates a loop',
        400,
        'CIRCULAR_DEPENDENCY',
      );
    }

    const existing = await prisma.taskDependency.findUnique({
      where: {
        task_id_prerequisite_id: {
          task_id: taskId,
          prerequisite_id: prerequisiteId,
        },
      },
    });

    if (existing) {
      if (existing.deleted_at === null) {
        return existing;
      }

      // Reactivate soft-deleted dependency
      return prisma.$transaction(async (tx) => {
        const reactivated = await tx.taskDependency.update({
          where: { id: existing.id },
          data: { deleted_at: null },
          include: {
            prerequisite: {
              select: { id: true, title: true, status: true, department: true },
            },
          },
        });

        if (userId) {
          await tx.auditLog.create({
            data: {
              task_id: taskId,
              user_id: userId,
              changed_column: 'dependency',
              old_value: null,
              new_value: `Added prerequisite ${prerequisiteId}`,
            },
          });
        }

        return reactivated;
      });
    }

    return prisma.$transaction(async (tx) => {
      const created = await tx.taskDependency.create({
        data: {
          task_id: taskId,
          prerequisite_id: prerequisiteId,
        },
        include: {
          prerequisite: {
            select: { id: true, title: true, status: true, department: true },
          },
        },
      });

      if (userId) {
        await tx.auditLog.create({
          data: {
            task_id: taskId,
            user_id: userId,
            changed_column: 'dependency',
            old_value: null,
            new_value: `Added prerequisite ${prerequisiteId}`,
          },
        });
      }

      return created;
    });
  }

  /**
   * Soft-remove dependency with audit log
   */
  static async removeDependency(
    taskId: string,
    prerequisiteId: string,
    userId?: string,
  ) {
    const existing = await prisma.taskDependency.findFirst({
      where: {
        task_id: taskId,
        prerequisite_id: prerequisiteId,
        deleted_at: null,
      },
    });

    if (!existing) {
      return { count: 0 };
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.taskDependency.update({
        where: { id: existing.id },
        data: { deleted_at: new Date() },
      });

      if (userId) {
        await tx.auditLog.create({
          data: {
            task_id: taskId,
            user_id: userId,
            changed_column: 'dependency',
            old_value: `Removed prerequisite ${prerequisiteId}`,
            new_value: null,
          },
        });
      }

      return updated;
    });
  }

  /**
   * Update task with State-Based RBAC/ABAC rules, Optimistic Locking, and Audit Logs
   */
  static async updateTask(
    taskId: string,
    currentUser: { id: string; role: Role; department: Department },
    data: {
      title?: string;
      description?: string;
      status?: TaskStatus;
      assignee_id?: string | null;
      due_date?: Date | null;
      client_visible?: boolean;
      version: number; // Mandatory for optimistic locking
    },
  ) {
    // 1. Fetch current task
    const currentTask = await prisma.task.findFirst({
      where: { id: taskId, deleted_at: null },
      include: {
        dependencies: {
          where: { deleted_at: null },
          include: { prerequisite: true },
        },
      },
    });

    if (!currentTask) {
      throw new TaskServiceError('Task not found', 404, 'NOT_FOUND');
    }

    // 2. Concurrency & Optimistic Locking check
    if (data.version !== currentTask.version) {
      throw new TaskServiceError(
        `Concurrency conflict: Task was updated by another user (Client version: ${data.version}, Current version: ${currentTask.version}). Please refresh data.`,
        409,
        'CONFLICT',
        [
          {
            field: 'version',
            currentVersion: currentTask.version,
            sentVersion: data.version,
          },
        ],
      );
    }

    // Constraint: Only the assigned executor can complete a task into DONE status (Brief: 'only the executor can complete it')
    if (
      data.status === TaskStatus.DONE &&
      currentTask.status !== TaskStatus.DONE
    ) {
      if (currentTask.assignee_id !== currentUser.id) {
        if (
          currentUser.role === Role.PRODUCT_MANAGER ||
          currentUser.role === Role.SUPER_ADMIN
        ) {
          throw new TaskServiceError(
            'Managers cannot complete tasks into DONE status. Only the assigned executor can complete the task.',
            403,
            'FORBIDDEN_STATUS_TRANSITION',
          );
        }
        throw new TaskServiceError(
          'Only the assigned executor can complete this task into DONE status.',
          403,
          'FORBIDDEN_NOT_EXECUTOR',
        );
      }
    }

    // Internal Team Status Transitions (Bab 3.1 & 4.1): Only assigned engineer can update task status
    if (
      currentUser.role === Role.INTERNAL_TEAM &&
      data.status &&
      data.status !== currentTask.status
    ) {
      if (currentTask.assignee_id !== currentUser.id) {
        throw new TaskServiceError(
          'Only the assigned engineer can update the status of this deliverable.',
          403,
          'FORBIDDEN_NOT_ASSIGNEE',
        );
      }
    }

    // Reopen Constraint (Bab 3.1): Only PM / Super Admin can reopen a DONE task back to IN_PROGRESS
    if (
      currentTask.status === TaskStatus.DONE &&
      data.status === TaskStatus.IN_PROGRESS &&
      currentUser.role !== Role.PRODUCT_MANAGER &&
      currentUser.role !== Role.SUPER_ADMIN
    ) {
      throw new TaskServiceError(
        'Only Product Managers and Super Admins can reopen completed tasks into IN_PROGRESS status.',
        403,
        'FORBIDDEN_STATUS_TRANSITION',
      );
    }

    // Internal Team Constraints: Cannot edit core fields
    if (currentUser.role === Role.INTERNAL_TEAM) {
      if (data.title !== undefined && data.title !== currentTask.title) {
        throw new TaskServiceError(
          'Internal engineers cannot modify the task title. Only Product Managers have this permission.',
          403,
          'FORBIDDEN_FIELD_EDIT',
        );
      }
      if (
        data.description !== undefined &&
        data.description !== currentTask.description
      ) {
        throw new TaskServiceError(
          'Internal engineers cannot modify the core description of a task. Only Product Managers have this permission.',
          403,
          'FORBIDDEN_FIELD_EDIT',
        );
      }
      if (data.assignee_id !== undefined) {
        throw new TaskServiceError(
          'Internal engineers cannot assign or reassign tasks. Only Product Managers have this permission.',
          403,
          'FORBIDDEN_FIELD_EDIT',
        );
      }
      if (data.due_date !== undefined) {
        throw new TaskServiceError(
          'Internal engineers cannot modify due dates. Only Product Managers have this permission.',
          403,
          'FORBIDDEN_FIELD_EDIT',
        );
      }
      if (data.client_visible !== undefined) {
        throw new TaskServiceError(
          'Internal engineers cannot modify client visibility. Only Product Managers have this permission.',
          403,
          'FORBIDDEN_FIELD_EDIT',
        );
      }
    }

    // State-Based Dependency Check: If moving to IN_PROGRESS or DONE, all prerequisites must be DONE
    if (data.status && data.status !== currentTask.status) {
      if (
        data.status === TaskStatus.IN_PROGRESS ||
        data.status === TaskStatus.DONE
      ) {
        const depCheck = await TaskService.checkDependencies(taskId);
        if (depCheck.isBlocked) {
          throw new TaskServiceError(
            `Cannot move task to ${data.status}. Task is blocked by pending prerequisites: ${depCheck.pendingPrerequisites.join(', ')}`,
            422,
            'TASK_BLOCKED',
            depCheck.pendingPrerequisites,
          );
        }
      }
    }

    // 4. Atomic Transaction: Update task + Increment version + Write Immutable Audit Logs
    const auditEntries: Array<{
      task_id: string;
      user_id: string;
      changed_column: string;
      old_value: string | null;
      new_value: string | null;
    }> = [];

    if (data.status && data.status !== currentTask.status) {
      auditEntries.push({
        task_id: taskId,
        user_id: currentUser.id,
        changed_column: 'status',
        old_value: currentTask.status,
        new_value: data.status,
      });
    }

    if (
      data.description !== undefined &&
      data.description !== currentTask.description
    ) {
      auditEntries.push({
        task_id: taskId,
        user_id: currentUser.id,
        changed_column: 'description',
        old_value: currentTask.description,
        new_value: data.description,
      });
    }

    if (
      data.assignee_id !== undefined &&
      data.assignee_id !== currentTask.assignee_id
    ) {
      auditEntries.push({
        task_id: taskId,
        user_id: currentUser.id,
        changed_column: 'assignee_id',
        old_value: currentTask.assignee_id,
        new_value: data.assignee_id,
      });
    }

    if (data.title && data.title !== currentTask.title) {
      auditEntries.push({
        task_id: taskId,
        user_id: currentUser.id,
        changed_column: 'title',
        old_value: currentTask.title,
        new_value: data.title,
      });
    }

    if (data.due_date !== undefined) {
      const oldDue = currentTask.due_date
        ? new Date(currentTask.due_date).toISOString()
        : null;
      const newDue = data.due_date
        ? new Date(data.due_date).toISOString()
        : null;
      if (oldDue !== newDue) {
        auditEntries.push({
          task_id: taskId,
          user_id: currentUser.id,
          changed_column: 'due_date',
          old_value: oldDue,
          new_value: newDue,
        });
      }
    }

    if (
      data.client_visible !== undefined &&
      data.client_visible !== currentTask.client_visible
    ) {
      auditEntries.push({
        task_id: taskId,
        user_id: currentUser.id,
        changed_column: 'client_visible',
        old_value: String(currentTask.client_visible),
        new_value: String(data.client_visible),
      });
    }

    return prisma.$transaction(async (tx) => {
      // 1. Atomic update with version check in WHERE clause (True Optimistic Concurrency Control)
      const updateResult = await tx.task.updateMany({
        where: {
          id: taskId,
          version: data.version,
          deleted_at: null,
        },
        data: {
          ...(data.title !== undefined ? { title: data.title } : {}),
          ...(data.description !== undefined
            ? { description: data.description }
            : {}),
          ...(data.status !== undefined ? { status: data.status } : {}),
          ...(data.assignee_id !== undefined
            ? { assignee_id: data.assignee_id }
            : {}),
          ...(data.due_date !== undefined ? { due_date: data.due_date } : {}),
          ...(data.client_visible !== undefined
            ? { client_visible: data.client_visible }
            : {}),
          version: { increment: 1 },
        },
      });

      if (updateResult.count === 0) {
        throw new TaskServiceError(
          `Concurrency conflict: Task was updated by another user (Client version: ${data.version}). Please refresh data.`,
          409,
          'CONFLICT',
          [
            {
              field: 'version',
              sentVersion: data.version,
            },
          ],
        );
      }

      // 2. Fetch updated task with complete relations
      const updatedTask = await tx.task.findUniqueOrThrow({
        where: { id: taskId },
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              department: true,
              avatar_url: true,
            },
          },
          dependencies: {
            where: { deleted_at: null },
            include: {
              prerequisite: {
                select: {
                  id: true,
                  title: true,
                  status: true,
                  department: true,
                },
              },
            },
          },
          prerequisites: {
            where: { deleted_at: null },
            include: {
              task: {
                select: {
                  id: true,
                  title: true,
                  status: true,
                  department: true,
                },
              },
            },
          },
        },
      });

      // 3. Insert audit logs
      if (auditEntries.length > 0) {
        await tx.auditLog.createMany({
          data: auditEntries,
        });
      }

      return updatedTask;
    });
  }

  /**
   * Mask task for Client Guest role
   */
  static maskTaskForClient(task: any) {
    return {
      id: task.id,
      project_id: task.project_id,
      title: task.title,
      description: task.description,
      status: task.status,
      due_date: task.due_date,
      created_at: task.created_at,
      updated_at: task.updated_at,
      // Internal identities and departments are masked
      assignee: task.assignee
        ? {
            id: 'masked',
            name: 'Assigned Engineer',
            avatar_url: null,
          }
        : null,
      // Exclude internal dependencies/audit logs
    };
  }
}
