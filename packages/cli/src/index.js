#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));

const args = process.argv.slice(2);
const silentArgs = ['--version', '-V', '--help', '-h'];
const isSilent = args.length === 0 || silentArgs.some(a => args.includes(a));

if (!isSilent) {
  console.log(chalk.cyan(`
██████╗ ███████╗██╗   ██╗██████╗  ██████╗  ██████╗██╗  ██╗
██╔══██╗██╔════╝██║   ██║██╔══██╗██╔═══██╗██╔════╝██║ ██╔╝
██║  ██║█████╗  ██║   ██║██║  ██║██║   ██║██║     █████╔╝ 
██║  ██║██╔══╝  ╚██╗ ██╔╝██║  ██║██║   ██║██║     ██╔═██╗ 
██████╔╝███████╗ ╚████╔╝ ██████╔╝╚██████╔╝╚██████╗██║  ██╗
╚═════╝ ╚══════╝  ╚═══╝  ╚═════╝  ╚═════╝  ╚═════╝╚═╝  ╚═╝
`));
  console.log(chalk.gray(`  AI-powered dev environment manager  v${pkg.version}\n`));
}

program
  .name('devdock')
  .description('AI-powered local dev environment manager')
  .version(pkg.version);

const commands = ['init', 'up', 'down', 'status', 'doctor', 'switch', 'list', 'logs', 'onboard'];

for (const cmd of commands) {
  const { default: register } = await import(`./commands/${cmd}.js`);
  register(program);
}

program.parse();
