import chalk from 'chalk';
import ora from 'ora';
import { resolve } from 'path';
import { ProjectAnalyzer, DockerManager } from '@devdock/core';

export default function register(program) {
  program
    .command('down')
    .description('Stop all services for current project')
    .argument('[path]', 'Project path (defaults to current directory)')
    .action(async (pathArg) => {
      const projectPath = resolve(pathArg || process.cwd());
      const analyzer = new ProjectAnalyzer(projectPath);
      const analysis = analyzer.analyze();

      console.log(chalk.cyan('⏹  Stopping services...') + chalk.gray(`  ${analysis.name}\n`));

      const spinner = ora('  Stopping containers...').start();
      const manager = new DockerManager(analysis.name);

      try {
        const results = await manager.stopServices();
        if (results.length === 0) {
          spinner.info('  No running services found');
        } else {
          spinner.succeed(`  Stopped ${results.length} service(s)\n`);
          results.forEach(r => {
            const name = r.name.replace(`/devdock-${analysis.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-`, '');
            console.log(chalk.gray('  ✓ ') + chalk.white(name));
          });
        }
        console.log('');
      } catch (err) {
        spinner.fail(chalk.red(`  ${err.message}`));
      }
    });
}
