import chalk from 'chalk';
import ora from 'ora';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { ProjectAnalyzer, DockerManager, EnvGenerator, Registry } from '@devdock/core';

export default function register(program) {
  program
    .command('up')
    .description('Auto-detect stack and spin up all required services')
    .argument('[path]', 'Project path (defaults to current directory)')
    .option('--no-env', 'Skip .env generation')
    .action(async (pathArg, options) => {
      const projectPath = resolve(pathArg || process.cwd());

      if (!existsSync(projectPath)) {
        console.log(chalk.red(`  ✗ Path not found: ${projectPath}\n`));
        process.exit(1);
      }

      console.log(chalk.cyan('⚡ Starting dev environment...\n'));

      // ── Analyze ───────────────────────────────────────────────
      const analyzeSpinner = ora('Scanning project...').start();
      let analysis;
      try {
        const analyzer = new ProjectAnalyzer(projectPath);
        analysis = analyzer.analyze();
        analyzeSpinner.succeed(
          `${chalk.white(analysis.name)}  ${chalk.gray('→')}  ${chalk.cyan(analysis.stack)}  ${chalk.gray('·')}  ${chalk.yellow(analysis.services.length + ' service(s) needed')}`
        );
      } catch (err) {
        analyzeSpinner.fail('Failed to scan project');
        console.log(chalk.red(`  ${err.message}\n`));
        process.exit(1);
      }

      if (analysis.services.length === 0) {
        console.log(chalk.yellow('\n  No services detected.\n'));
        console.log(chalk.gray('  devdock works with projects using postgres, redis, mongodb, mysql, or rabbitmq.'));
        console.log(chalk.gray('  Make sure your package.json lists the relevant dependencies.\n'));
        process.exit(0);
      }

      // ── Docker check ──────────────────────────────────────────
      const dockerSpinner = ora('Connecting to Docker...').start();
      const manager = new DockerManager(analysis.name);
      const dockerAlive = await manager.ping();
      if (!dockerAlive) {
        dockerSpinner.fail('Docker is not running');
        console.log(chalk.gray('\n  Start Docker and try again.\n'));
        process.exit(1);
      }
      dockerSpinner.succeed('Docker ready');

      // ── Spin up services ──────────────────────────────────────
      console.log('');
      const serviceResults = [];
      for (const service of analysis.services) {
        const spinner = ora(`  Starting ${chalk.cyan(service)}...`).start();
        try {
          const result = await manager.startService(service);
          serviceResults.push(result);
          const label = result.status === 'already_running' ? 'already running' :
                        result.status === 'restarted' ? 'restarted' : 'started';
          spinner.succeed(`  ${chalk.green(service.padEnd(12))} ${chalk.gray(label)}  ${chalk.cyan('localhost:' + result.port)}`);
        } catch (err) {
          spinner.fail(`  ${service}  ${chalk.red(err.message)}`);
        }
      }

      // ── ENV ───────────────────────────────────────────────────
      console.log('');
      if (options.env !== false) {
        const envSpinner = ora('  Checking .env...').start();
        try {
          const generator = new EnvGenerator(projectPath, analysis, serviceResults);
          const envResult = generator.generate();
          if (envResult.created) {
            envSpinner.succeed(`  .env created  ${chalk.gray('(' + Object.keys(envResult.vars).length + ' variables)')}`);
          } else {
            envSpinner.info('  .env already exists  ' + chalk.gray('(skipped)'));
          }
        } catch (err) {
          envSpinner.fail(`  .env generation failed: ${err.message}`);
        }
      }

      // ── Register ──────────────────────────────────────────────
      const registry = new Registry();
      registry.register(projectPath, analysis, serviceResults);

      // ── Summary ───────────────────────────────────────────────
      console.log('\n' + chalk.gray('  ─'.repeat(26)));
      console.log(chalk.green('  ✓ Everything is running\n'));
      serviceResults.forEach(s => {
        console.log(chalk.gray('  →') + chalk.cyan(` localhost:${s.port}`) + chalk.gray(`  (${s.service})`));
      });
      console.log(chalk.gray('\n  Stop anytime:  ') + chalk.white('devdock down'));
      console.log(chalk.gray('  View logs:     ') + chalk.white('devdock logs <service>'));
      console.log(chalk.gray('  Health check:  ') + chalk.white('devdock status'));
      console.log(chalk.gray('  ─'.repeat(26)) + '\n');
    });
}
