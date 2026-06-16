import { DockerManager } from '../packages/core/src/index.js';

const manager = new DockerManager('test-project');

console.log('\n🐳 Testing Docker Manager...\n');

const alive = await manager.ping();
console.log(`Docker running: ${alive}`);

if (!alive) {
  console.error('Docker is not running. Start Docker first.');
  process.exit(1);
}

console.log('\nSpinning up postgres + redis...\n');

const results = await manager.startServices(['postgres', 'redis']);

for (const r of results) {
  console.log(`✓ ${r.service} → port ${r.port} (${r.status})`);
}

console.log('\nChecking status...\n');
const status = await manager.getStatus();
for (const s of status) {
  console.log(`  ${s.service}: ${s.status} | ports: ${s.ports}`);
}

console.log('\n✓ Docker manager working!\n');
console.log('Run this to verify in Docker:');
console.log('  docker ps\n');
