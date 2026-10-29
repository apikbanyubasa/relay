import request from 'supertest';
import app from './index.js';

async function runTests() {
  console.log('🧪 Starting Comprehensive Automated Backend Verification...\n');
  let passedCount = 0;
  let totalCount = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalCount++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`❌ [FAIL] ${testName} - ${detail || ''}`);
    }
  }

  // 1. Healthcheck
  const healthRes = await request(app).get('/health');
  assert(
    healthRes.status === 200 && healthRes.body?.data?.status === 'ok',
    'Health Check API',
  );

  // 2. Login as PM
  const pmLoginRes = await request(app).post('/api/auth/login').send({
    email: 'pm@relay.id',
    password: 'Password123!',
  });
  const pmToken = pmLoginRes.body?.data?.token;
  assert(pmLoginRes.status === 200 && !!pmToken, 'PM Login Authentication');

  // 3. List tasks using ezfilter query params
  const listTasksRes = await request(app)
    .get('/api/tasks?page=1&rows=10&filters={"client_visible":true}')
    .set('Authorization', `Bearer ${pmToken}`);
  const listTasksJson = listTasksRes.body;
  assert(
    listTasksRes.status === 200 &&
      Array.isArray(listTasksJson.data) &&
      listTasksJson.meta?.totalRows > 0,
    'List Tasks with Relay Query Engine Contract',
  );

  const tasks = listTasksJson.data || [];
  const taskB = tasks.find((t: any) => t.title.includes('Task B'));
  const taskC = tasks.find((t: any) => t.title.includes('Task C'));

  assert(!!taskB && !!taskC, 'Found Seeded Tasks B & C');
  assert(
    taskC?.isBlocked === true,
    'Task C is automatically detected as Blocked',
  );

  // 4. Test State-Based Permission: PM cannot complete task from IN_PROGRESS to DONE
  if (taskB) {
    const pmCompleteRes = await request(app)
      .patch(`/api/tasks/${taskB.id}`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({
        status: 'DONE',
        version: taskB.version,
      });
    assert(
      pmCompleteRes.status === 403 &&
        pmCompleteRes.body?.error?.code === 'FORBIDDEN_STATUS_TRANSITION',
      'State-Based Constraint: PM Forbidden to move IN_PROGRESS to DONE',
    );
  }

  // 5. Login as Frontend Engineer
  const feLoginRes = await request(app).post('/api/auth/login').send({
    email: 'fe@relay.id',
    password: 'Password123!',
  });
  const feToken = feLoginRes.body?.data?.token;
  assert(feLoginRes.status === 200 && !!feToken, 'Frontend Engineer Login');

  // 6. Test Dependency Blocking: FE cannot move Task C to IN_PROGRESS while Task B is not DONE
  if (taskC) {
    const feMoveBlockedRes = await request(app)
      .patch(`/api/tasks/${taskC.id}`)
      .set('Authorization', `Bearer ${feToken}`)
      .send({
        status: 'IN_PROGRESS',
        version: taskC.version,
      });
    assert(
      feMoveBlockedRes.status === 422 &&
        feMoveBlockedRes.body?.error?.code === 'TASK_BLOCKED',
      'Dependency Protection: Blocked Task cannot be moved to IN_PROGRESS (HTTP 422)',
    );

    // 7. Test Concurrency & Optimistic Locking: Outdated version -> 409 Conflict
    const conflictRes = await request(app)
      .patch(`/api/tasks/${taskC.id}`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({
        title: 'Task C Modified Title',
        version: 9999, // Mismatched version
      });
    assert(
      conflictRes.status === 409 &&
        conflictRes.body?.error?.code === 'CONFLICT',
      'Optimistic Locking: Version Mismatch rejected with HTTP 409 Conflict',
    );
  }

  // 8. Login as Client Guest
  const clientLoginRes = await request(app).post('/api/auth/login').send({
    email: 'client@client.com',
    password: 'Password123!',
  });
  const clientToken = clientLoginRes.body?.data?.token;
  assert(clientLoginRes.status === 200 && !!clientToken, 'Client Guest Login');

  // 9. Client Portal View & Data Masking
  const projectsRes = await request(app)
    .get('/api/projects')
    .set('Authorization', `Bearer ${clientToken}`);
  const clientProject = projectsRes.body?.data?.[0];
  assert(
    projectsRes.status === 200 && !!clientProject,
    'Client Guest sees assigned project',
  );

  if (clientProject) {
    const clientViewRes = await request(app)
      .get(`/api/projects/${clientProject.id}/client-view`)
      .set('Authorization', `Bearer ${clientToken}`);
    const clientTasks = clientViewRes.body?.data?.tasks || [];
    const hasInternalVisibleTask = clientTasks.some((t: any) =>
      t.title.includes('Task D'),
    );
    const hasExposedEngineerName = clientTasks.some(
      (t: any) =>
        t.assignee?.name &&
        t.assignee?.name !== 'Assigned Specialist' &&
        t.assignee?.name !== 'Assigned Engineer',
    );

    assert(
      clientViewRes.status === 200 &&
        !hasInternalVisibleTask &&
        !hasExposedEngineerName,
      'Client Guest View: Strict Data Masking & Non-visible Task Scrubbing',
    );
  }

  // 10. Standup Summary Report
  const reportRes = await request(app)
    .get('/api/reports/standup-summary')
    .set('Authorization', `Bearer ${pmToken}`);
  assert(
    reportRes.status === 200 &&
      !!reportRes.body?.data?.summary?.UI_UX &&
      !!reportRes.body?.data?.summary?.FRONTEND,
    'Daily Standup Auto-Summary per Department',
  );

  console.log(`\n🎉 Test Results: ${passedCount}/${totalCount} Passed!`);
  if (passedCount === totalCount) {
    console.log(
      '🌟 ALL ENTERPRISE ASSESSMENT EDGE-CASES VERIFIED SUCCESSFULLY!',
    );
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Test execution failed:', e);
  process.exit(1);
});
