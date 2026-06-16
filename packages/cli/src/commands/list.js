import chalk from 'chalk';
import { Registry } from '../core/index.js';

export default function register(program) {
  program
    .command('list')
    .description('List all projects managed by devdock')
    .action(async () => {
      const registry = new Registry();
      const projects = registry.getAll();

      console.log(chalk.cyan(`\n📦 devdock projects\n`));

      if (projects.length === 0) {
        console.log(chalk.yellow('  No projects yet. Run devdock up inside a project.\n'));
        return;
      }

      for (const p of projects) {
        console.log(chalk.white(`  ${p.name}`) + chalk.gray(` — ${p.path}`));
        console.log(chalk.gray(`    stack: ${p.stack} | services: ${p.services.join(', ')}`));
        console.log(chalk.gray(`    last up: ${new Date(p.lastUp).toLocaleString()}\n`));
      }
    });
}
