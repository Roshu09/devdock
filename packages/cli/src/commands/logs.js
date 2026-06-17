import chalk from 'chalk';
import { resolve } from 'path';
import { ProjectAnalyzer } from '@devdock/core';
import Docker from 'dockerode';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

export default function register(program) {
  program
    .command('logs')
    .description('Stream live logs from a running service')
    .argument('<service>', 'Service name (postgres, redis, mongodb...)')
    .option('-n, --lines <number>', 'Number of past lines to show', '50')
    .option('--no-follow', 'Print logs and exit without following')
    .option('-p, --path <path>', 'Project path (defaults to current directory)')
    .action(async (service, options) => {
      const projectPath = resolve(options.path || process.cwd());
      const analyzer = new ProjectAnalyzer(projectPath);
      const analysis = analyzer.analyze();
      const availableServices = analysis.services;

      if (!availableServices.includes(service)) {
        console.log(chalk.red(`\n  ✗ Unknown service: ${service}`));
        console.log(chalk.gray(`  Available: ${availableServices.join(', ')}\n`));
        process.exit(1);
      }

      const projectName = analysis.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const containerName = `devdock-${projectName}-${service}`;

      console.log(chalk.cyan(`\n📜 devdock logs — ${service}\n`));
      console.log(chalk.gray(`  Container : ${containerName}`));
      console.log(chalk.gray(`  Lines     : last ${options.lines}`));
      console.log(chalk.gray(`  Following : ${options.follow !== false}\n`));
      console.log(chalk.gray('─'.repeat(60)));

      try {
        const containers = await docker.listContainers({ all: true });
        const found = containers.find(c => c.Names.includes(`/${containerName}`));

        if (!found) {
          console.log(chalk.red(`\n  ✗ Container not found: ${containerName}`));
          console.log(chalk.gray('  Run devdock up first.\n'));
          process.exit(1);
        }

        if (found.State !== 'running') {
          console.log(chalk.yellow(`\n  ⚠  Container is ${found.State}, not running`));
          console.log(chalk.gray('  Run devdock up to start it.\n'));
          process.exit(1);
        }

        const container = docker.getContainer(found.Id);
        const logStream = await container.logs({
          stdout: true,
          stderr: true,
          tail: parseInt(options.lines),
          follow: options.follow !== false,
          timestamps: true
        });

        const serviceColors = {
          postgres: chalk.blue,
          redis: chalk.red,
          mongodb: chalk.green,
          mysql: chalk.cyan,
          rabbitmq: chalk.yellow
        };
        const colorFn = serviceColors[service] || chalk.white;

        logStream.on('data', (chunk) => {
          const raw = chunk.slice(8).toString('utf8');
          const lines = raw.split('\n').filter(Boolean);
          lines.forEach(line => {
            const tsMatch = line.match(/^(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s+(.*)$/);
            if (tsMatch) {
              const ts = new Date(tsMatch[1]).toLocaleTimeString();
              const msg = tsMatch[2];
              console.log(chalk.gray(`[${ts}] `) + colorFn(msg));
            } else {
              console.log(colorFn(line));
            }
          });
        });

        logStream.on('error', (err) => {
          console.error(chalk.red(`\n  Log error: ${err.message}\n`));
        });

        logStream.on('end', () => {
          console.log(chalk.gray('\n' + '─'.repeat(60)));
          console.log(chalk.gray('  End of logs.\n'));
        });

        process.on('SIGINT', () => {
          console.log(chalk.gray('\n\n  Stopped following logs.\n'));
          process.exit(0);
        });

      } catch (err) {
        console.error(chalk.red(`\n  ✗ ${err.message}\n`));
        process.exit(1);
      }
    });
}
