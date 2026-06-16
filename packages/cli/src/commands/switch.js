import chalk from 'chalk';

export default function register(program) {
  program
    .command('switch')
    .description('devdock switch command')
    .action(async () => {
      console.log(chalk.yellow('⚙  switch — coming in next build...'));
    });
}
