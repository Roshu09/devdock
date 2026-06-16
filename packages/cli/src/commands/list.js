import chalk from 'chalk';

export default function register(program) {
  program
    .command('list')
    .description('devdock list command')
    .action(async () => {
      console.log(chalk.yellow('⚙  list — coming in next build...'));
    });
}
