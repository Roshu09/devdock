import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { resolve } from 'path';
import { ProjectAnalyzer, DockerManager, Registry } from '@devdock/core';

export default function register(program) {
  program
    .command('switch')
    .description('Switch dev environment between projects')
    .action(async () => {
      const registry = new Registry();
      const projects = registry.getAll();

      console.log(chalk.cyan('\n🔀 devdock switch\n'));

      if (projects.length < 2) {
        console.log(chalk.yellow('  Need at least 2 projects registered.'));
        console.log(chalk.gray('  Run: devdock up <path> in another project first.\n'));
        return;
      }

      // Show current project based on cwd
      const cwd = process.cwd();
      const current = projects.find(p => cwd.startsWith(p.path));
      if (current) {
        console.log(chalk.gray(`  Current: ${chalk.white(current.name)}\n`));
      }

      // Let user pick target project
      const { target } = await inquirer.prompt([{
        type: 'list',
        name: 'target',
        message: 'Switch to which project?',
        choices: projects
          .filter(p => p.path !== current?.path)
          .map(p => ({
            name: `${p.name} ${chalk.gray('(' + p.services.join(', ') + ')')}`,
            value: p
          }))
      }]);

      // Stop current project services
      if (current) {
        const stopSpinner = ora(`Stopping ${current.name} services...`).start();
        try {
          const currentManager = new DockerManager(current.name);
          await currentManager.stopServices();
          stopSpinner.succeed(`${current.name} services stopped`);
        } catch (err) {
          stopSpinner.warn(`Could not stop ${current.name}: ${err.message}`);
        }
      }

      // Start target project services
      console.log('');
      const startSpinner = ora(`Starting ${target.name} services...`).start();
      try {
        const targetManager = new DockerManager(target.name);
        await targetManager.ensureNetwork();
        const results = await targetManager.startServices(target.services);
        startSpinner.succeed(`${target.name} services started`);

        console.log('');
        for (const r of results) {
          console.log(
            chalk.gray('  • ') +
            chalk.green(r.service.padEnd(12)) +
            chalk.cyan(`localhost:${r.port}`)
          );
        }

        console.log(chalk.gray(`\n  cd ${target.path}`));
        console.log(chalk.gray('  Then start your app as usual.\n'));

      } catch (err) {
        startSpinner.fail(`Failed to start ${target.name}: ${err.message}`);
      }
    });
}
