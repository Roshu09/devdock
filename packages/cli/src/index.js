#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));

const args = process.argv.slice(2);
const isInit = args[0] === 'init';
const isHelp = args.includes('--help') || args.includes('-h') || args.length === 0;
const isVersion = args.includes('--version') || args.includes('-V');

if (isInit) {
  console.log(chalk.cyan(`
██████╗ ███████╗██╗   ██╗██████╗  ██████╗  ██████╗██╗  ██╗
██╔══██╗██╔════╝██║   ██║██╔══██╗██╔═══██╗██╔════╝██║ ██╔╝
██║  ██║█████╗  ██║   ██║██║  ██║██║   ██║██║     █████╔╝ 
██║  ██║██╔══╝  ╚██╗ ██╔╝██║  ██║██║   ██║██║     ██╔═██╗ 
██████╔╝███████╗ ╚████╔╝ ██████╔╝╚██████╔╝╚██████╗██║  ██╗
╚═════╝ ╚══════╝  ╚═══╝  ╚═════╝  ╚═════╝  ╚═════╝╚═╝  ╚═╝
`));
  console.log(chalk.gray(`  AI-powered dev environment manager  v${pkg.version}\n`));
} else if (!isHelp && !isVersion) {
  console.log(chalk.cyan(`devdock`) + chalk.gray(` v${pkg.version}  🐳\n`));
}

program
  .name('devdock')
  .description('AI-powered local dev environment manager')
  .version(pkg.version)
  .addHelpText('before', `
  ${chalk.cyan('ENVIRONMENT')}
    init              First-time setup — saves your Groq API key
    up [path]         Auto-detect stack and spin up all services
    down [path]       Stop all services for current project
    status [path]     Show live service health and ports

  ${chalk.cyan('AI POWERED')}
    doctor [path]     AI diagnosis of broken environments
    onboard [path]    Generate SETUP.md onboarding guide
    ci:generate       Generate GitHub Actions CI workflow

  ${chalk.cyan('UTILITIES')}
    logs <service>    Stream live service logs
    switch            Switch between projects
    list              List all registered projects

  ${chalk.cyan('EXAMPLES')}
    ${chalk.gray('$')} devdock up
    ${chalk.gray('$')} devdock logs postgres --path ./myproject
    ${chalk.gray('$')} devdock doctor
    ${chalk.gray('$')} devdock ci:generate
`);

const commands = ['init', 'up', 'down', 'status', 'doctor', 'switch', 'list', 'logs', 'onboard'];

for (const cmd of commands) {
  const { default: register } = await import(`./commands/${cmd}.js`);
  register(program);
}

const { default: ciGenerate } = await import('./commands/ci-generate.js');
ciGenerate(program);

program.parse();
