import chalk from 'chalk';
import { Registry } from '@devdock/core';

export default function register(program) {
  program
    .command('list')
    .description('List all projects managed by devdock')
    .action(async () => {
      const registry = new Registry();
      const projects = registry.getAll();

      console.log(chalk.cyan('📦 Projects\n'));

      if (projects.length === 0) {
        console.log(chalk.yellow('  No projects yet.'));
        console.log(chalk.gray('  Run ') + chalk.white('devdock up <path>') + chalk.gray(' inside any project.\n'));
        return;
      }

      projects.forEach((p, i) => {
        const isLast = i === projects.length - 1;
        console.log(chalk.white(`  ${p.name}`) + chalk.gray(`  —  ${p.stack}`));
        console.log(chalk.gray(`  ${p.path}`));
        console.log(chalk.gray(`  services: `) + chalk.cyan(p.services.join(', ')));
        console.log(chalk.gray(`  last up:  ${new Date(p.lastUp).toLocaleString()}`));
        if (!isLast) console.log('');
      });
      console.log('');
    });
}
