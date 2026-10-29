import assert from 'node:assert';
import request from 'supertest';
import { app } from './index.js';

async function runTests() {
  console.log('🧪 Testing User Management & Profile Settings APIs...');

  // 1. Login as Admin
  const adminLogin = await request(app).post('/api/auth/login').send({
    email: 'admin@relay.id',
    password: 'Password123!',
  });
  assert.strictEqual(adminLogin.status, 200, 'Admin login failed');
  const adminToken = adminLogin.body.data.token;
  console.log('✅ [PASS] Super Admin Login');

  // 2. Login as FE
  const feLogin = await request(app).post('/api/auth/login').send({
    email: 'fe@relay.id',
    password: 'Password123!',
  });
  assert.strictEqual(feLogin.status, 200, 'FE login failed');
  const feToken = feLogin.body.data.token;
  console.log('✅ [PASS] FE User Login');

  // 3. Test Profile API for FE (Self-service)
  const profileRes = await request(app)
    .get('/api/users/profile')
    .set('Authorization', `Bearer ${feToken}`);
  assert.strictEqual(profileRes.status, 200);
  assert.strictEqual(profileRes.body.data.email, 'fe@relay.id');
  console.log('✅ [PASS] User Profile Fetch');

  // 4. Update Profile for FE
  const updateProfileRes = await request(app)
    .patch('/api/users/profile')
    .set('Authorization', `Bearer ${feToken}`)
    .send({
      name: 'Dimas Anggara Updated',
      avatar_url:
        'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=200',
    });
  assert.strictEqual(updateProfileRes.status, 200);
  assert.strictEqual(updateProfileRes.body.data.name, 'Dimas Anggara Updated');
  console.log('✅ [PASS] User Profile Self-Update');

  // 5. Non-Admin (FE) cannot access Admin User Management
  const forbiddenList = await request(app)
    .get('/api/users')
    .set('Authorization', `Bearer ${feToken}`);
  assert.strictEqual(
    forbiddenList.status,
    403,
    'Expected 403 Forbidden for non-admin',
  );
  console.log('✅ [PASS] Non-Admin RBAC Protection (Forbidden 403)');

  // 6. Admin User List
  const adminList = await request(app)
    .get('/api/users?limit=10')
    .set('Authorization', `Bearer ${adminToken}`);
  assert.strictEqual(adminList.status, 200);
  assert.ok(adminList.body.data.length >= 5, 'Should return all seeded users');
  console.log('✅ [PASS] Super Admin User List');

  // 7. Admin Create User
  const newEmail = `engineer_${Date.now()}@relay.id`;
  const createUserRes = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'New Test Engineer',
      email: newEmail,
      password: 'Password123!',
      role: 'INTERNAL_TEAM',
      department: 'BACKEND',
      avatar_url:
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    });
  assert.strictEqual(createUserRes.status, 201);
  const createdUserId = createUserRes.body.data.id;
  console.log('✅ [PASS] Super Admin Create User');

  // 8. Admin Update User
  const updateUserRes = await request(app)
    .patch(`/api/users/${createdUserId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Promoted PM Engineer',
      role: 'PRODUCT_MANAGER',
      department: 'PRODUCT',
    });
  assert.strictEqual(updateUserRes.status, 200);
  assert.strictEqual(updateUserRes.body.data.role, 'PRODUCT_MANAGER');
  console.log('✅ [PASS] Super Admin Update User (Role & Dept)');

  // 9. Admin Soft Delete User
  const deleteUserRes = await request(app)
    .delete(`/api/users/${createdUserId}`)
    .set('Authorization', `Bearer ${adminToken}`);
  assert.strictEqual(deleteUserRes.status, 200);
  console.log('✅ [PASS] Super Admin Soft-Delete User');

  // 10. Admin Cannot Delete Self Guard
  const deleteSelfRes = await request(app)
    .delete(`/api/users/${adminLogin.body.data.user.id}`)
    .set('Authorization', `Bearer ${adminToken}`);
  assert.strictEqual(deleteSelfRes.status, 400);
  console.log('✅ [PASS] Super Admin Self-Delete Protection');

  console.log('\n🎉 ALL USER MANAGEMENT APIS VERIFIED AND PASSING CLEANLY!');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
