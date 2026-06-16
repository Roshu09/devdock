import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { DEVDOCK_DIR, CONFIG_FILE, PROJECTS_FILE } from '@devdock/shared';

export default function register(program) {
  program
    .command('init')
    .description('Initialize devdock on your machine')
    .action(async () => {
      console.log(chalk.cyan('Setting up devdock on your machine...\n'));

      const spinner = ora('Creating config directory...').start();

      try {
        if (!existsSync(DEVDOCK_DIR)) {
          mkdirSync(DEVDOCK_DIR, { recursive: true });
        }

        if (!existsSync(PROJECTS_FILE)) {
          writeFileSync(PROJECTS_FILE, JSON.stringify({ projects: [] }, null, 2));
        }

        spinner.succeed('Config directory created at ~/.devdock');

        // Ask for Groq API key
        const { groqKey } = await inquirer.prompt([
          {
            type: 'password',
            name: 'groqKey',
            message: 'Enter your Groq API key (free at console.groq.com):',
            mask: '*',
            validate: (val) => val.length > 10 || 'Please enter a valid key'
          }
        ]);

        const config = {
          groqApiKey: groqKey,
          createdAt: new Date().toISOString(),
          version: '0.1.0'
        };

        writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

        console.log(chalk.green('\n✓ devdock is ready!\n'));
        console.log(chalk.gray('  Next: cd into any project and run ') + chalk.cyan('devdock up'));
        console.log(chalk.gray('  Need help? Run ') + chalk.cyan('devdock doctor\n'));

      } catch (err) {
        spinner.fail('Setup failed');
        console.error(chalk.red(err.message));
        process.exit(1);
      }
    });
}
