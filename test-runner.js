const { execSync } = require('child_process');

console.log('Running Jest tests...');

try {
  const output = execSync('node node_modules/jest/bin/jest.js --testTimeout=10000 --maxWorkers=1', {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'pipe'
  });
  console.log(output);
} catch (error) {
  console.log('Tests completed with some failures:');
  console.log(error.stdout);
  if (error.stderr) {
    console.log('Errors:');
    console.log(error.stderr);
  }
}