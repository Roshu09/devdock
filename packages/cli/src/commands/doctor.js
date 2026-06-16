import chalk from 'chalk';

export default function register(program) {
  program
    .command('doctor')
    .description('devdock doctor command')
    .action(async () => {
      console.log(chalk.yellow('⚙  doctor — coming in next build...'));
    });
}
