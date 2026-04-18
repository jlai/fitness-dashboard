const fs = require('fs');
const path = require('path');

// Read the swagger file
const swaggerPath = path.join(__dirname, 'docs', 'fitbit-web-api-swagger.json');
const swagger = JSON.parse(fs.readFileSync(swaggerPath, 'utf8'));

// The regex pattern from the API proxy
const PATH_REGEX = /^\/[0-9]+(?:\.[0-9]+)?\/user\/-\/.+\.(json|tcx)$/;

// Extract all paths from swagger
const apiPaths = Object.keys(swagger.paths);

console.log('Testing Fitbit API paths against regex pattern:');
console.log('Pattern:', PATH_REGEX);
console.log('\nTotal paths:', apiPaths.length);
console.log('=====================================\n');

let passed = 0;
let failed = 0;
const failedPaths = [];

apiPaths.forEach(apiPath => {
  // Skip OAuth endpoints (they don't follow the user API pattern)
  if (apiPath.includes('oauth2') || apiPath.includes('oauth')) {
    console.log(`⏭️  SKIPPED (OAuth): ${apiPath}`);
    return;
  }
  
  // Skip device endpoints that don't follow the pattern
  if (apiPath.includes('/devices/') && !apiPath.includes('/user/')) {
    console.log(`⏭️  SKIPPED (Device): ${apiPath}`);
    return;
  }

  // Skip public endpoints
  if (!apiPath.includes('/user/-/')) {
    console.log(`⏭️  SKIPPED (Public): ${apiPath}`);
    return;
  }

  // Test against regex
  if (PATH_REGEX.test(apiPath)) {
    console.log(`✅ PASS: ${apiPath}`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${apiPath}`);
    failed++;
    failedPaths.push(apiPath);
  }
});

console.log('\n=====================================');
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failedPaths.length > 0) {
  console.log('\nFailed paths:');
  failedPaths.forEach(p => console.log(`  - ${p}`));
}
