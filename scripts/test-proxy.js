/**
 * Local Proxy Validation Script
 * Tests:
 * 1. Root dashboard (/)
 * 2. Trailing slash redirect (/tickten -> 301 -> /tickten/)
 * 3. Proxy fetch to tickten.pages.dev (/tickten/)
 */

const BASE_URL = process.env.TEST_URL || 'http://127.0.0.1:8788';

async function runTests() {
  console.log(`\n🔍 Starting Tools Gateway validation tests on ${BASE_URL}...\n`);
  let passed = 0;
  let failed = 0;

  // Test 1: Root (/)
  try {
    const res = await fetch(`${BASE_URL}/`, { redirect: 'manual' });
    const text = await res.text();
    if (res.status === 200 && text.includes('GimsLab Tools Gateway')) {
      console.log('✅ Test 1 Passed: Root landing dashboard served (200 OK)');
      passed++;
    } else {
      console.error(`❌ Test 1 Failed: Root response status=${res.status}`);
      failed++;
    }
  } catch (err) {
    console.error('❌ Test 1 Error:', err.message);
    failed++;
  }

  // Test 2: Trailing Slash 301 Redirect (/tickten -> /tickten/)
  try {
    const res = await fetch(`${BASE_URL}/tickten`, { redirect: 'manual' });
    const location = res.headers.get('location');
    if (res.status === 301 && location && location.endsWith('/tickten/')) {
      console.log(`✅ Test 2 Passed: /tickten 301 redirected to ${location}`);
      passed++;
    } else {
      console.error(`❌ Test 2 Failed: Status=${res.status}, Location=${location}`);
      failed++;
    }
  } catch (err) {
    console.error('❌ Test 2 Error:', err.message);
    failed++;
  }

  // Test 3: Proxy Fetch (/tickten/ -> https://tickten.pages.dev/)
  try {
    const res = await fetch(`${BASE_URL}/tickten/`, { redirect: 'follow' });
    const text = await res.text();
    const gatewayHeader = res.headers.get('x-gimslab-gateway');
    const toolHeader = res.headers.get('x-gimslab-tool');

    if (res.status === 200 && (text.toLowerCase().includes('tickten') || text.includes('Vite') || text.includes('React') || text.includes('<html'))) {
      console.log(`✅ Test 3 Passed: /tickten/ proxied successfully (200 OK)`);
      console.log(`   - Gateway header: ${gatewayHeader}`);
      console.log(`   - Tool header: ${toolHeader}`);
      console.log(`   - Content sample: ${text.slice(0, 100).replace(/\s+/g, ' ')}...`);
      passed++;
    } else {
      console.error(`❌ Test 3 Failed: Status=${res.status}, Content=${text.slice(0, 150)}`);
      failed++;
    }
  } catch (err) {
    console.error('❌ Test 3 Error:', err.message);
    failed++;
  }

  console.log(`\n=============================`);
  console.log(`Tests finished: ${passed} passed, ${failed} failed`);
  console.log(`=============================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
