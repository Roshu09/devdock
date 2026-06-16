import chalk from 'chalk';

export default function register(program) {
  program
    .command('down')
    .description('devdock down command')
    .action(async () => {
      console.log(chalk.yellow('⚙  down — coming in next build...'));
    });
}
