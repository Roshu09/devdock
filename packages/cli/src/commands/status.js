import chalk from 'chalk';
import { resolve } from 'path';
import { ProjectAnalyzer, DockerManager } from '@devdock/core';
import Docker from 'dockerode';

const isWindows = process.platform === 'win32';
const docker = new Docker(
  isWindows
    ? { socketPath: '//./pipe/docker_engine' }
    : { socketPath: '/var/run/docker.sock' }
);

export default function register(program) {
  program
    .command('status')
    .description('Show live service health and ports')
    .argument('[path]', 'Project path (defaults to current directory)')
    .action(async (pathArg) => {
      const projectPath = resolve(pathArg || process.cwd());
      const analyzer = new ProjectAnalyzer(projectPath);
      const analysis = analyzer.analyze();
      const manager = new DockerManager(analysis.name);

      console.log(chalk.cyan(`📊 Status  `) + chalk.gray(`${analysis.name}\n`));

      const containers = await manager.getStatus();

      if (containers.length === 0) {
        console.log(chalk.yellow('  No services running.'));
        console.log(chalk.gray('  Run: ') + chalk.white('devdock up') + chalk.gray(' to start.\n'));
        return;
      }

      // Header
      console.log(
        chalk.gray('  ' + 'SERVICE'.padEnd(14) + 'STATUS'.padEnd(12) + 'PORT'.padEnd(10) + 'CONTAINER')
      );
      console.log(chalk.gray('  ' + '─'.repeat(52)));

      // Get detailed info for uptime
      for (const c of containers) {
        const statusDot = c.status === 'running' ? chalk.green('●') : chalk.red('●');
        const statusText = c.status === 'running' ? chalk.green('running') : chalk.red(c.status);

        // Extract just the host port cleanly
        const portMatch = c.ports?.match(/(\d+)→/);
        const port = portMatch ? `:${portMatch[1]}` : 'n/a';

        // Get uptime
        let uptime = '';
        try {
          const containers = await docker.listContainers();
          const found = containers.find(ct => ct.Names.includes(`/${c.name}`));
          if (found) {
            const seconds = Math.floor(Date.now() / 1000) - found.Created;
            if (seconds < 3600) uptime = `${Math.floor(seconds / 60)}m`;
            else if (seconds < 86400) uptime = `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
            else uptime = `${Math.floor(seconds / 86400)}d`;
          }
        } catch {}

        console.log(
          '  ' +
          statusDot + ' ' +
          chalk.white(c.service.padEnd(13)) +
          chalk.green('running'.padEnd(12)) +
          chalk.cyan(port.padEnd(12)) +
          chalk.gray(uptime)
        );
      }
      console.log('');
    });
}
