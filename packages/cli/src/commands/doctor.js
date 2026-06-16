import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { resolve } from 'path';
import { existsSync, readFileSync } from 'fs';
import { ProjectAnalyzer, DockerManager } from '@devdock/core';
import { diagnose } from '@devdock/ai';

export default function register(program) {
  program
    .command('doctor')
    .description('AI-powered diagnosis of your dev environment')
    .argument('[path]', 'Project path (defaults to current directory)')
    .option('--error <log>', 'Paste an error message for AI to analyze')
    .action(async (pathArg, options) => {
      const projectPath = resolve(pathArg || process.cwd());

      console.log(chalk.cyan('\n🩺 devdock doctor — AI diagnosis\n'));

      // ── Analyze project ───────────────────────────────────────
      const analyzer = new ProjectAnalyzer(projectPath);
      const analysis = analyzer.analyze();

      // ── Get container statuses ────────────────────────────────
      const manager = new DockerManager(analysis.name);
      const dockerAlive = await manager.ping();

      let containerStatuses = [];
      if (dockerAlive) {
        containerStatuses = await manager.getStatus();
      } else {
        containerStatuses = analysis.services.map(s => ({
          service: s, status: 'docker_not_running', ports: ''
        }));
      }

      // ── Collect error log if not passed via flag ──────────────
      let errorLog = options.error || null;

      if (!errorLog) {
        const { hasError } = await inquirer.prompt([{
          type: 'confirm',
          name: 'hasError',
          message: 'Do you have an error message to share with the AI?',
          default: false
        }]);

        if (hasError) {
          const { errorText } = await inquirer.prompt([{
            type: 'editor',
            name: 'errorText',
            message: 'Paste your error (opens editor, save and close when done):'
          }]);
          errorLog = errorText;
        }
      }

      // ── Collect env vars (keys only, no values for security) ──
      const envVarKeys = Object.keys(analysis.envVars).map(k => `${k}=***`);

      // ── Run AI diagnosis ──────────────────────────────────────
      const spinner = ora('AI is analyzing your environment...').start();

      try {
        const diagnosis = await diagnose({
          projectName: analysis.name,
          stack: analysis.stack,
          services: analysis.services,
          containerStatuses,
          errorLog,
          envVars: envVarKeys
        });

        spinner.succeed('Diagnosis complete\n');

        // Pretty print the diagnosis
        const sections = diagnosis.split('\n\n');
        for (const section of sections) {
          if (section.startsWith('DIAGNOSIS:')) {
            console.log(chalk.yellow.bold('  DIAGNOSIS'));
            console.log(chalk.white('  ' + section.replace('DIAGNOSIS:', '').trim()) + '\n');
          } else if (section.startsWith('ROOT CAUSE:')) {
            console.log(chalk.red.bold('  ROOT CAUSE'));
            console.log(chalk.white('  ' + section.replace('ROOT CAUSE:', '').trim()) + '\n');
          } else if (section.startsWith('FIX STEPS:')) {
            console.log(chalk.green.bold('  FIX STEPS'));
            const steps = section.replace('FIX STEPS:', '').trim().split('\n');
            for (const step of steps) {
              console.log(chalk.white('  ' + step));
            }
            console.log('');
          } else if (section.startsWith('PREVENTION:')) {
            console.log(chalk.cyan.bold('  PREVENTION TIP'));
            console.log(chalk.gray('  ' + section.replace('PREVENTION:', '').trim()) + '\n');
          } else if (section.trim()) {
            console.log(chalk.gray('  ' + section.trim()) + '\n');
          }
        }

      } catch (err) {
        spinner.fail('AI diagnosis failed');
        console.error(chalk.red(`\n  ${err.message}\n`));
        console.log(chalk.gray('  Manual checks:'));
        console.log(chalk.gray('  • Run: docker ps'));
        console.log(chalk.gray('  • Check your .env file exists'));
        console.log(chalk.gray('  • Run: devdock up\n'));
      }
    });
}
