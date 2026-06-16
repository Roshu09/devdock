import chalk from 'chalk';

export default function register(program) {
  program
    .command('status')
    .description('devdock status command')
    .action(async () => {
      console.log(chalk.yellow('⚙  status — coming in next build...'));
    });
}
