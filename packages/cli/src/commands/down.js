import chalk from 'chalk';
import ora from 'ora';
import { resolve } from 'path';
import { ProjectAnalyzer, DockerManager, Registry } from '@devdock/core';

export default function register(program) {
  program
    .command('down')
    .description('Stop all services for current project')
    .argument('[path]', 'Project path (defaults to current directory)')
    .action(async (pathArg) => {
      const projectPath = resolve(pathArg || process.cwd());
      const analyzer = new ProjectAnalyzer(projectPath);
      const analysis = analyzer.analyze();

      console.log(chalk.cyan(`\n⏹  devdock down — ${analysis.name}\n`));

      const spinner = ora('Stopping services...').start();
      const manager = new DockerManager(analysis.name);

      try {
        const results = await manager.stopServices();

        if (results.length === 0) {
          spinner.info('No running services found for this project');
        } else {
          spinner.succeed(`Stopped ${results.length} service(s)`);
          for (const r of results) {
            console.log(chalk.gray(`  • ${r.name} — ${chalk.yellow('stopped')}`));
          }
        }
        console.log('');
      } catch (err) {
        spinner.fail(err.message);
      }
    });
}
