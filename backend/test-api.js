// backend/test-api.js
require('dotenv').config();

async function runTests() {
  const baseUrl = 'http://localhost:3000/api';
  console.log('[TEST] Starting backend integration test suite (2-Step Email OTP & User ID Sharing)...\n');

  try {
    // 1. Health check
    console.log('[TEST 1/9] GET /api/health');
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthData = await healthRes.json();
    console.log('   Response:', healthData);
    if (!healthRes.ok) throw new Error('Health check failed');

    // 2. Signup User A (Returns requiresOtp: true)
    const testUsernameA = `userA_${Date.now().toString().slice(-4)}`;
    const testEmailA = `${testUsernameA}@taskplanner.io`;
    const testPassword = 'password123';

    console.log(`\n[TEST 2/9] POST /api/auth/signup for User A (${testEmailA})`);
    const signupRes = await fetch(`${baseUrl}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsernameA,
        email: testEmailA,
        password: testPassword
      })
    });
    const signupData = await signupRes.json();
    console.log('   Result:', signupData.message);
    if (!signupData.requiresOtp) throw new Error('Expected 2-step OTP verification required');
    const signupOtpCode = signupData.devCode;
    console.log('   OTP Code generated:', signupOtpCode);

    // 3. Complete Registration with Email OTP Verification
    console.log('\n[TEST 3/9] POST /api/auth/verify-login-otp (Verify Signup OTP)');
    const verifySignupRes = await fetch(`${baseUrl}/auth/verify-login-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmailA,
        code: signupOtpCode
      })
    });
    const verifySignupData = await verifySignupRes.json();
    console.log('   Result:', verifySignupData.message, '| User ID:', verifySignupData.user?.id, '| Verified:', verifySignupData.user?.is_verified);
    if (!verifySignupRes.ok) throw new Error(verifySignupData.error || 'OTP verification failed');

    let tokenA = verifySignupData.token;
    const userAId = verifySignupData.user?.id;

    // 4. Test Login requesting OTP
    console.log('\n[TEST 4/9] POST /api/auth/login (Initiate Login with Email OTP)');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmailA,
        password: testPassword
      })
    });
    const loginData = await loginRes.json();
    console.log('   Result:', loginData.message);
    if (!loginData.requiresOtp) throw new Error('Expected login OTP challenge');
    const loginOtpCode = loginData.devCode;
    console.log('   Login OTP generated:', loginOtpCode);

    // 5. Complete Login with OTP Verification
    console.log('\n[TEST 5/9] POST /api/auth/verify-login-otp (Complete Login)');
    const verifyLoginRes = await fetch(`${baseUrl}/auth/verify-login-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmailA,
        code: loginOtpCode
      })
    });
    const verifyLoginData = await verifyLoginRes.json();
    console.log('   Login successful | User:', verifyLoginData.user?.username, '| Verified:', verifyLoginData.user?.is_verified);
    tokenA = verifyLoginData.token;

    // 6. User A Creates Task with Subtasks
    console.log('\n[TEST 6/9] POST /api/tasks (User A creates deliverable)');
    const createTaskRes = await fetch(`${baseUrl}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        title: 'Design Collaboration Engine',
        description: 'Multi-user access control verified via numeric User ID.',
        priority: 'high',
        category: 'Engineering',
        status: 'pending',
        estimated_minutes: 30,
        subtasks: [
          { id: '1', title: 'Verify User ID sharing route', completed: true }
        ]
      })
    });
    const createdTask = await createTaskRes.json();
    console.log('   Created task ID:', createdTask.id, '| Owner:', createdTask.owner_username);
    if (!createTaskRes.ok) throw new Error('Create task failed');

    // 7. Register and Verify User B (Collaborator)
    const testUsernameB = `userB_${Date.now().toString().slice(-4)}`;
    const testEmailB = `${testUsernameB}@taskplanner.io`;
    console.log(`\n[TEST 7/9] Register & verify User B (${testEmailB})`);
    const signupBRes = await fetch(`${baseUrl}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsernameB,
        email: testEmailB,
        password: 'password123'
      })
    });
    const signupBData = await signupBRes.json();

    const verifyBRes = await fetch(`${baseUrl}/auth/verify-login-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmailB,
        code: signupBData.devCode
      })
    });
    const verifyBData = await verifyBRes.json();
    const tokenB = verifyBData.token;
    const userBId = verifyBData.user?.id;
    console.log('   User B ready | User ID:', userBId, '| Username:', verifyBData.user?.username);

    // 8. User A Shares Task with User B Using User B's Numeric USER ID!
    console.log(`\n[TEST 8/9] POST /api/tasks/${createdTask.id}/share using User ID #${userBId}`);
    const shareRes = await fetch(`${baseUrl}/tasks/${createdTask.id}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        collaborator: userBId.toString(), // SHARING BY NUMERIC USER ID!
        permission: 'edit'
      })
    });
    const shareData = await shareRes.json();
    console.log('   Share result:', shareData.message, '| Collaborator User ID:', shareData.collaborator?.id);
    if (!shareRes.ok) throw new Error(shareData.error || 'Task share failed');

    // 9. User B Retrieves and Confirms Shared Task
    console.log(`\n[TEST 9/9] GET /api/tasks (User B confirms task shared via User ID)`);
    const userBTasksRes = await fetch(`${baseUrl}/tasks`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    const userBTasks = await userBTasksRes.json();
    const foundShared = userBTasks.find(t => t.id === createdTask.id);
    if (!foundShared) throw new Error('Shared task not visible to collaborator');
    console.log('   User B received shared task successfully:');
    console.log(`   &bull; Task ID: #${foundShared.id}`);
    console.log(`   &bull; Title: "${foundShared.title}"`);
    console.log(`   &bull; is_shared: ${foundShared.is_shared}`);
    console.log(`   &bull; Owner: @${foundShared.owner_username} (User ID #${foundShared.user_id})`);
    console.log(`   &bull; Permission: ${foundShared.share_permission}`);

    console.log('\n[SUCCESS] All 9 backend tests passed with 100% success rate!\n');
  } catch (error) {
    console.error('\n[FAILURE] Test run failed:', error.message);
    process.exit(1);
  }
}

runTests();
 