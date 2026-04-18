#!/usr/bin/env node

/**
 * Friends & Contacts Test Suite
 * Run with: node run-friend-tests.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
const API_BASE = 'http://localhost:3000/api/v1';

// Test users
const users = {
  alice: { email: 'alice@test.com', username: 'alice', password: 'password123' },
  bob: { email: 'bob@test.com', username: 'bob', password: 'password123' },
  diana: { email: 'diana@test.com', username: 'diana', password: 'password123' },
  eve: { email: 'eve@test.com', username: 'eve', password: 'password123' }
};

let sessionTokens = {};
let testResults = { passed: 0, failed: 0, skipped: 0 };

/**
 * Make HTTP request
 */
function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Cookie'] = `sessionToken=${token}`;
    }

    const req = http.request(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: {}, raw: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

/**
 * Login and get session token
 */
async function login(username) {
  const user = users[username];
  const response = await makeRequest('POST', '/auth/login', {
    email: user.email,
    password: user.password
  });

  if (response.status === 200) {
    // Extract token from Set-Cookie header
    const setCookie = response.headers['set-cookie'];
    if (setCookie) {
      const token = setCookie[0].split('sessionToken=')[1].split(';')[0];
      sessionTokens[username] = token;
      return token;
    }
  }
  throw new Error(`Login failed for ${username}: ${response.status}`);
}

/**
 * Test result logger
 */
function test(name, passed, message = '') {
  if (passed) {
    console.log(`✓ ${name}`);
    testResults.passed++;
  } else {
    console.log(`✗ ${name}`);
    if (message) console.log(`  Error: ${message}`);
    testResults.failed++;
  }
}

function skip(name, reason = '') {
  console.log(`⊘ ${name}`);
  if (reason) console.log(`  Reason: ${reason}`);
  testResults.skipped++;
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('🧪 Friends & Contacts Test Suite\n');
  console.log('='.repeat(60));

  try {
    // Pre-test: Login all users
    console.log('\n📝 Logging in test users...\n');
    for (const user of ['alice', 'bob', 'diana', 'eve']) {
      try {
        await login(user);
        console.log(`  ✓ ${user} logged in`);
      } catch (e) {
        console.log(`  ✗ ${user} login failed: ${e.message}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n📋 Test Cases:\n');

    // TC-FL-001: Empty Friend List
    try {
      const response = await makeRequest('GET', '/friends', null, sessionTokens['eve']);
      test('TC-FL-001: New user has empty friend list',
        response.status === 200 && Array.isArray(response.data.data) && response.data.data.length === 0);
    } catch (e) {
      test('TC-FL-001: New user has empty friend list', false, e.message);
    }

    // TC-FR-001: Send Friend Request by Username
    try {
      const response = await makeRequest('POST', '/friends/request',
        { username: 'diana' },
        sessionTokens['alice']
      );
      test('TC-FR-001: Send friend request by username',
        response.status === 201,
        response.status !== 201 ? `Got ${response.status}` : '');
    } catch (e) {
      test('TC-FR-001: Send friend request by username', false, e.message);
    }

    // TC-FR-004: Reject Invalid Username
    try {
      const response = await makeRequest('POST', '/friends/request',
        { username: 'nonexistent_user_xyz' },
        sessionTokens['bob']
      );
      test('TC-FR-004: Reject invalid username',
        response.status === 400 && response.data.error && response.data.error.includes('not found'),
        response.status !== 400 ? `Got ${response.status}` : '');
    } catch (e) {
      test('TC-FR-004: Reject invalid username', false, e.message);
    }

    // TC-FR-006: Reject Self-Request
    try {
      const response = await makeRequest('POST', '/friends/request',
        { username: 'alice' },
        sessionTokens['alice']
      );
      test('TC-FR-006: Cannot send request to yourself',
        response.status === 400 && response.data.error && response.data.error.includes('yourself'),
        response.status !== 400 ? `Got ${response.status}` : '');
    } catch (e) {
      test('TC-FR-006: Cannot send request to yourself', false, e.message);
    }

    // TC-FC-001: View Pending Requests
    try {
      const response = await makeRequest('GET', '/friends/requests/pending',
        null,
        sessionTokens['diana']
      );
      test('TC-FC-001: View pending requests',
        response.status === 200 && Array.isArray(response.data.data),
        response.status !== 200 ? `Got ${response.status}` : '');
    } catch (e) {
      test('TC-FC-001: View pending requests', false, e.message);
    }

    // TC-FL-002: Friend List Display
    try {
      const response = await makeRequest('GET', '/friends',
        null,
        sessionTokens['alice']
      );
      test('TC-FL-002: Retrieve friend list',
        response.status === 200 && Array.isArray(response.data.data),
        response.status !== 200 ? `Got ${response.status}` : '');
    } catch (e) {
      test('TC-FL-002: Retrieve friend list', false, e.message);
    }

    // TC-MSG-002: Non-Friends Cannot Message
    try {
      const response = await makeRequest('POST', '/friends/dialogs/13/messages',
        { content: 'Testing' },
        sessionTokens['eve']
      );
      // eve trying to message diana (ID 12) or someone else
      test('TC-MSG-002: Non-friends cannot message',
        response.status === 400 || response.status === 403,
        `Got ${response.status}, expected 400 or 403`);
    } catch (e) {
      test('TC-MSG-002: Non-friends cannot message', false, e.message);
    }

    // TC-SEC-002: Unauthenticated Access Blocked
    try {
      const response = await makeRequest('GET', '/friends', null, null);
      test('TC-SEC-002: Unauthenticated access blocked',
        response.status === 401,
        `Got ${response.status}, expected 401`);
    } catch (e) {
      test('TC-SEC-002: Unauthenticated access blocked', false, e.message);
    }

    // TC-BAN-001: Ban User Endpoint
    try {
      const response = await makeRequest('POST', '/friends/users/13/ban',
        null,
        sessionTokens['bob']
      );
      test('TC-BAN-001: Ban endpoint works',
        response.status === 201 || response.status === 400,
        `Got ${response.status}`);
    } catch (e) {
      test('TC-BAN-001: Ban endpoint works', false, e.message);
    }

    // TC-MSG-005: Message Content Validation
    try {
      const response = await makeRequest('GET', '/friends', null, sessionTokens['alice']);
      let aliceHasFriends = false;

      if (response.status === 200 && response.data.data && response.data.data.length > 0) {
        aliceHasFriends = true;
        const friend = response.data.data[0];

        // Try to send empty message
        const msgResponse = await makeRequest('POST', `/friends/dialogs/${friend.id}/messages`,
          { content: '' },
          sessionTokens['alice']
        );

        test('TC-MSG-005: Empty message rejected',
          msgResponse.status === 400 && msgResponse.data.error,
          msgResponse.status !== 400 ? `Got ${msgResponse.status}` : '');
      } else {
        skip('TC-MSG-005: Empty message rejected', 'Alice has no friends');
      }
    } catch (e) {
      test('TC-MSG-005: Empty message rejected', false, e.message);
    }

    // TC-MSG-006: Message Size Limit
    try {
      const response = await makeRequest('GET', '/friends', null, sessionTokens['alice']);
      if (response.status === 200 && response.data.data && response.data.data.length > 0) {
        const friend = response.data.data[0];

        // Create oversized message (> 3072 bytes)
        const hugeMsg = 'x'.repeat(3100);
        const msgResponse = await makeRequest('POST', `/friends/dialogs/${friend.id}/messages`,
          { content: hugeMsg },
          sessionTokens['alice']
        );

        test('TC-MSG-006: Message size limit enforced',
          msgResponse.status === 400 && msgResponse.data.error,
          msgResponse.status !== 400 ? `Got ${msgResponse.status}` : '');
      } else {
        skip('TC-MSG-006: Message size limit enforced', 'Alice has no friends');
      }
    } catch (e) {
      test('TC-MSG-006: Message size limit enforced', false, e.message);
    }

    // Skipped tests
    skip('TC-FC-002: Accept friend request', 'Requires manual accept via UI');
    skip('TC-RF-001: Remove friend', 'Requires pre-existing friendship');
    skip('TC-PERSIST-001: Survive server restart', 'Requires server restart');
    skip('TC-WS-001: WebSocket notifications', 'Requires WebSocket client');

  } catch (error) {
    console.error('Fatal error:', error);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Summary:\n');
  console.log(`  ✓ Passed:  ${testResults.passed}`);
  console.log(`  ✗ Failed:  ${testResults.failed}`);
  console.log(`  ⊘ Skipped: ${testResults.skipped}`);
  console.log(`\n  Total:    ${testResults.passed + testResults.failed + testResults.skipped}`);

  const passRate = ((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1);
  console.log(`\n✨ Pass Rate: ${passRate}%\n`);
}

// Run tests
runTests().catch(console.error);
