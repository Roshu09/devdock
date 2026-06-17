import chalk from 'chalk';
import ora from 'ora';
import { resolve } from 'path';
import { writeFileSync, existsSync } from 'fs';
import { ProjectAnalyzer } from '@devdock/core';
import { diagnose } from '@devdock/ai';
import { readFileSync } from 'fs';
import { CONFIG_FILE } from '@devdock/shared';
import Groq from 'groq-sdk';

export default function register(program) {
  program
    .command('onboard')
    .description('AI generates a SETUP.md onboarding guide for your project')
    .option('-p, --path <path>', 'Project path (defaults to current directory)')
    .option('-o, --output <file>', 'Output file name', 'SETUP.md')
    .action(async (options) => {
      const projectPath = resolve(options.path || process.cwd());
      const outputFile = resolve(projectPath, options.output);

      console.log(chalk.cyan('\n🚀 devdock onboard — AI project guide generator\n'));

      // ── Analyze project ───────────────────────────────────────
      const analyzeSpinner = ora('Analyzing project...').start();
      const analyzer = new ProjectAnalyzer(projectPath);
      const analysis = analyzer.analyze();
      analyzeSpinner.succeed(`Analyzed ${chalk.cyan(analysis.name)} — ${analysis.stack} project`);

      // ── Read key files for context ────────────────────────────
      const contextSpinner = ora('Reading project files...').start();

      let packageJson = {};
      let envExample = '';
      let existingReadme = '';

      try {
        const pkgPath = `${projectPath}/package.json`;
        if (existsSync(pkgPath)) {
          packageJson = JSON.parse(readFileSync(pkgPath, 'utf8'));
        }
      } catch {}

      try {
        const envPath = `${projectPath}/.env.example`;
        if (existsSync(envPath)) {
          envExample = readFileSync(envPath, 'utf8').slice(0, 2000);
        }
      } catch {}

      try {
        const readmePath = `${projectPath}/README.md`;
        if (existsSync(readmePath)) {
          existingReadme = readFileSync(readmePath, 'utf8').slice(0, 1000);
        }
      } catch {}

      contextSpinner.succeed('Project context gathered');

      // ── Generate with AI ──────────────────────────────────────
      const aiSpinner = ora('AI is generating your onboarding guide...').start();

      try {
        const config = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
        const groq = new Groq({ apiKey: config.groqApiKey });

        const prompt = `You are a senior developer writing a clear, friendly onboarding guide for a project.

PROJECT INFO:
- Name: ${analysis.name}
- Stack: ${analysis.stack}
- Package name: ${packageJson.name || analysis.name}
- Description: ${packageJson.description || 'No description'}
- Scripts available: ${JSON.stringify(packageJson.scripts || {})}
- Required services: ${analysis.services.join(', ') || 'none'}
- Environment variables: ${Object.keys(analysis.envVars).join(', ')}
- Has Docker: ${analysis.hasDocker}
- Package manager: ${analysis.packageManager}

ENV EXAMPLE (first 2000 chars):
${envExample || 'Not found'}

EXISTING README SNIPPET:
${existingReadme || 'Not found'}

Generate a complete SETUP.md file in Markdown format that includes:

1. # Project Name + one-line description
2. ## Prerequisites — exact versions needed
3. ## Quick Start — numbered steps to get running in under 5 minutes
4. ## Environment Variables — table with Variable, Required, Default, Description for each env var
5. ## Running Services — what each service does and how devdock manages it
6. ## Available Scripts — what each npm script does
7. ## Common Issues — 3 most likely setup problems and their fixes
8. ## Project Structure — brief explanation of key folders

Write it as if you are the project author explaining to a new team member.
Be specific, practical, and friendly. Use real values from the project info above.
Format it beautifully with proper Markdown.`;

        const response = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.4,
          max_tokens: 2000
        });

        const setupContent = response.choices[0].message.content;
        aiSpinner.succeed('AI guide generated');

        // ── Write to file ─────────────────────────────────────
        const writeSpinner = ora(`Writing ${options.output}...`).start();
        writeFileSync(outputFile, setupContent);
        writeSpinner.succeed(`${chalk.green(options.output)} created at ${outputFile}`);

        // ── Summary ───────────────────────────────────────────
        console.log('\n' + chalk.cyan('─'.repeat(50)));
        console.log(chalk.green.bold('\n  ✓ Onboarding guide ready!\n'));
        console.log(chalk.gray('  File    : ') + chalk.white(outputFile));
        console.log(chalk.gray('  Content : ') + chalk.white(`${setupContent.split('\n').length} lines`));
        console.log(chalk.gray('\n  Share this file with new contributors'));
        console.log(chalk.gray('  or commit it to your repo.\n'));
        console.log(chalk.cyan('─'.repeat(50) + '\n'));

      } catch (err) {
        aiSpinner.fail('AI generation failed');
        console.error(chalk.red(`\n  ${err.message}\n`));
        process.exit(1);
      }
    });
}
