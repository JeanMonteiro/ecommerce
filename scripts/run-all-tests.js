#!/usr/bin/env node
/**
 * Runs yarn install + jest in every package and service with a test suite.
 * Exits 1 if any target fails.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const TARGETS = [
  'packages/auth-middleware',
  'packages/messaging',
  'packages/event-contracts',
  'services/auth',
  'services/catalog',
  'services/cart',
  'services/orders',
  'services/inventory',
  'services/payment',
  'services/notifications',
  'services/api-gateway',
];

function run(command, args, cwd) {
  return spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, CI: process.env.CI ?? 'true' },
  });
}

function installDependencies(dir, label) {
  const hasLockfile = fs.existsSync(path.join(dir, 'yarn.lock'));
  const frozenArgs = hasLockfile ? ['install', '--frozen-lockfile'] : ['install'];
  let result = run('yarn', frozenArgs, dir);

  if (result.status !== 0 && hasLockfile) {
    console.warn(`${label}: frozen lockfile install failed, retrying with yarn install`);
    result = run('yarn', ['install'], dir);
  }

  return result.status === 0;
}

function runTests(dir) {
  const result = run('yarn', ['test', '--watchman=false', '--ci'], dir);
  return result.status === 0;
}

const failures = [];

console.log(`Running tests in ${TARGETS.length} targets...\n`);

for (const rel of TARGETS) {
  const dir = path.join(ROOT, rel);
  console.log(`\n${'='.repeat(60)}\n${rel}\n${'='.repeat(60)}\n`);

  if (!fs.existsSync(dir)) {
    console.error(`Directory not found: ${rel}`);
    failures.push(`${rel} (missing directory)`);
    continue;
  }

  if (!installDependencies(dir, rel)) {
    console.error(`${rel}: yarn install failed`);
    failures.push(`${rel} (install)`);
    continue;
  }

  if (!runTests(dir)) {
    console.error(`${rel}: tests failed`);
    failures.push(`${rel} (tests)`);
  }
}

console.log(`\n${'='.repeat(60)}`);
if (failures.length === 0) {
  console.log(`All ${TARGETS.length} targets passed.`);
  process.exit(0);
}

console.error(`\nFailed targets (${failures.length}/${TARGETS.length}):`);
for (const name of failures) {
  console.error(`  - ${name}`);
}
process.exit(1);
