import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { ProjectAnalyzer, DockerManager, EnvGenerator, Registry } from '@devdock/core';

export default function register(program) {
  program
    .command('up')
    .description('Analyze project and spin up all required services')
    .argument('[path]', 'Project path (defaults to current directory)')
    .option('--no-env', 'Skip .env generation')
    .action(async (pathArg, options) => {

      const projectPath = resolve(pathArg || process.cwd());

      if (!existsSync(projectPath)) {
        console.error(chalk.red(`\n✗ Path not found: ${projectPath}\n`));
        process.exit(1);
      }

      console.log(chalk.cyan(`\n⚡ devdock up — ${projectPath}\n`));

      // ── Step 1: Analyze ──────────────────────────────────────
      const analyzeSpinner = ora('Analyzing project structure...').start();
      let analysis;

      try {
        const analyzer = new ProjectAnalyzer(projectPath);
        analysis = analyzer.analyze();
        analyzeSpinner.succeed(
          `Detected ${chalk.cyan(analysis.stack)} project — ` +
          `${chalk.yellow(analysis.services.length)} service(s) needed`
        );
      } catch (err) {
        analyzeSpinner.fail('Analysis failed');
        console.error(chalk.red(err.message));
        process.exit(1);
      }

      if (analysis.services.length === 0) {
        console.log(chalk.yellow(
          '\n⚠  No services detected. devdock works best with projects using\n' +
          '   postgres, redis, mongodb, mysql, or rabbitmq.\n'
        ));
        console.log(chalk.gray('   Tip: Make sure your package.json lists DB dependencies.\n'));
        process.exit(0);
      }

      // ── Step 2: Docker check ─────────────────────────────────
      const dockerSpinner = ora('Connecting to Docker...').start();
      const manager = new DockerManager(analysis.name);
      const dockerAlive = await manager.ping();

      if (!dockerAlive) {
        dockerSpinner.fail('Docker is not running');
        console.log(chalk.red('\n  Please start Docker and try again.\n'));
        process.exit(1);
      }
      dockerSpinner.succeed('Docker is ready');

      // ── Step 3: Spin up services ─────────────────────────────
      console.log(chalk.gray(`\n  Services to start: ${analysis.services.join(', ')}\n`));

      const serviceResults = [];

      for (const service of analysis.services) {
        const spinner = ora(`Starting ${service}...`).start();
        try {
          const result = await manager.startService(service);
          serviceResults.push(result);

          if (result.status === 'already_running') {
            spinner.succeed(`${chalk.green(service)} already running on port ${chalk.cyan(result.port)}`);
          } else if (result.status === 'restarted') {
            spinner.succeed(`${chalk.green(service)} restarted on port ${chalk.cyan(result.port)}`);
          } else {
            spinner.succeed(`${chalk.green(service)} started on port ${chalk.cyan(result.port)}`);
          }
        } catch (err) {
          spinner.fail(`Failed to start ${service}: ${err.message}`);
        }
      }

      // ── Step 4: Generate .env ────────────────────────────────
      if (options.env !== false) {
        const envSpinner = ora('Generating .env file...').start();
        try {
          const generator = new EnvGenerator(projectPath, analysis, serviceResults);
          const envResult = generator.generate();

          if (envResult.created) {
            envSpinner.succeed(`.env created with ${Object.keys(envResult.vars).length} variables`);
          } else {
            envSpinner.info(`.env already exists — skipped (${envResult.reason})`);
          }
        } catch (err) {
          envSpinner.fail(`Env generation failed: ${err.message}`);
        }
      }

      // ── Step 5: Register project ─────────────────────────────
      const registry = new Registry();
      registry.register(projectPath, analysis, serviceResults);

      // ── Step 6: Summary box ──────────────────────────────────
      const lines = [
        chalk.green.bold('✓ devdock up — everything is running\n'),
        chalk.gray('  Project : ') + chalk.white(analysis.name),
        chalk.gray('  Stack   : ') + chalk.cyan(analysis.stack),
        '',
        chalk.gray('  Services:'),
        ...serviceResults.map(s =>
          chalk.gray('    • ') +
          chalk.green(s.service.padEnd(12)) +
          chalk.cyan(`localhost:${s.port}`)
        ),
        '',
        chalk.gray('  Next: ') + chalk.white('install deps and start your app'),
        chalk.gray('  Stop: ') + chalk.white('devdock down'),
      ];

      console.log('\n' + boxen(lines.join('\n'), {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'cyan'
      }));
    });
}
