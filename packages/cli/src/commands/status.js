import chalk from 'chalk';
import { resolve } from 'path';
import { ProjectAnalyzer, DockerManager } from '@devdock/core';

export default function register(program) {
  program
    .command('status')
    .description('Show running services for current project')
    .argument('[path]', 'Project path (defaults to current directory)')
    .action(async (pathArg) => {
      const projectPath = resolve(pathArg || process.cwd());
      const analyzer = new ProjectAnalyzer(projectPath);
      const analysis = analyzer.analyze();
      const manager = new DockerManager(analysis.name);

      console.log(chalk.cyan(`\n📊 devdock status — ${analysis.name}\n`));

      const containers = await manager.getStatus();

      if (containers.length === 0) {
        console.log(chalk.yellow('  No services running. Run devdock up to start.\n'));
        return;
      }

      for (const c of containers) {
        const statusColor = c.status === 'running' ? chalk.green : chalk.red;
        console.log(
          chalk.gray('  • ') +
          chalk.white(c.service.padEnd(12)) +
          statusColor(c.status.padEnd(10)) +
          chalk.cyan(c.ports)
        );
      }
      console.log('');
    });
}
