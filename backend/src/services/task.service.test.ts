import assert from 'node:assert';
import { describe, it } from 'node:test';
import { Department, TaskStatus } from '@prisma/client';
import { TaskService } from './task.service.js';

describe('TaskService Unit Tests', () => {
  describe('Data Masking for Client Guest', () => {
    it('should scrub internal engineer identities and departments', () => {
      const internalTask = {
        id: 'task-123',
        project_id: 'proj-456',
        title: 'Confidential Core Engine Slicing',
        description: 'Detailed technical specification and secrets',
        status: TaskStatus.IN_PROGRESS,
        department: Department.FRONTEND,
        version: 3,
        client_visible: true,
        due_date: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
        assignee: {
          id: 'user-789',
          name: 'Dimas Anggara (Frontend)',
          email: 'fe@relay.id',
          department: Department.FRONTEND,
          avatar_url: 'https://avatar.url/dimas.jpg',
        },
      };

      const masked = TaskService.maskTaskForClient(internalTask);

      // Verify that sensitive fields are scrubbed
      assert.strictEqual(masked.id, 'task-123');
      assert.strictEqual(masked.title, 'Confidential Core Engine Slicing');
      assert.strictEqual(masked.assignee?.name, 'Assigned Engineer');
      assert.strictEqual(masked.assignee?.avatar_url, null);
      assert.strictEqual((masked as any).assignee?.email, undefined);
      assert.strictEqual((masked as any).assignee?.department, undefined);
      assert.strictEqual((masked as any).department, undefined);
    });

    it('should handle unassigned tasks safely when masking', () => {
      const unassignedTask = {
        id: 'task-999',
        project_id: 'proj-456',
        title: 'Unassigned Backlog Item',
        description: 'Open ticket',
        status: TaskStatus.TODO,
        due_date: null,
        created_at: new Date(),
        updated_at: new Date(),
        assignee: null,
      };

      const masked = TaskService.maskTaskForClient(unassignedTask);
      assert.strictEqual(masked.assignee, null);
    });
  });

  describe('Anti-Circular Dependency Detection (DAG Logic)', () => {
    it('should identify direct self-dependency as cyclic', async () => {
      const isCycle = await TaskService.wouldCreateCycle('task-a', 'task-a');
      assert.strictEqual(isCycle, true);
    });
  });
});
