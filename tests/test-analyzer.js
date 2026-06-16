import { ProjectAnalyzer } from '../packages/core/src/index.js';
import path from 'path';

// Test against a real project path — use your DocMind or any Node project
const testPath = process.argv[2] || process.cwd();

console.log(`\nAnalyzing: ${testPath}\n`);

const analyzer = new ProjectAnalyzer(testPath);
const result = analyzer.analyze();

console.log('═══════════════════════════════════');
console.log('  ANALYSIS RESULT');
console.log('═══════════════════════════════════');
console.log(`  Project   : ${result.name}`);
console.log(`  Stack     : ${result.stack}`);
console.log(`  Services  : ${result.services.join(', ') || 'none detected'}`);
console.log(`  Env Vars  : ${Object.keys(result.envVars).length} found`);
console.log(`  Has Docker: ${result.hasDocker}`);
console.log(`  Pkg Mgr   : ${result.packageManager}`);
console.log('═══════════════════════════════════');

if (Object.keys(result.envVars).length > 0) {
  console.log('\n  ENV VARS FOUND:');
  for (const [key, val] of Object.entries(result.envVars)) {
    console.log(`    ${key}=${val || '<empty>'}`);
  }
}
