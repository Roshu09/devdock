import chalk from 'chalk';
import ora from 'ora';
import { resolve } from 'path';
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { ProjectAnalyzer } from '@devdock/core';
import { CONFIG_FILE } from '@devdock/shared';
import Groq from 'groq-sdk';

export default function register(program) {
  program
    .command('ci:generate')
    .description('AI generates a production-ready GitHub Actions CI workflow')
    .option('-p, --path <path>', 'Project path (defaults to current directory)')
    .action(async (options) => {
      const projectPath = resolve(options.path || process.cwd());

      console.log(chalk.cyan('\n⚙️  devdock ci:generate — GitHub Actions workflow generator\n'));

      // ── Analyze ───────────────────────────────────────────────
      const analyzeSpinner = ora('Analyzing project...').start();
      const analyzer = new ProjectAnalyzer(projectPath);
      const analysis = analyzer.analyze();
      analyzeSpinner.succeed(`Analyzed ${chalk.cyan(analysis.name)} — ${analysis.stack} · services: ${analysis.services.join(', ') || 'none'}`);

      // ── Read package.json for scripts + node version ──────────
      let packageJson = {};
      let nodeVersion = '20';
      try {
        const pkgPath = `${projectPath}/package.json`;
        if (existsSync(pkgPath)) {
          packageJson = JSON.parse(readFileSync(pkgPath, 'utf8'));
          const enginesNode = packageJson.engines?.node;
          if (enginesNode) {
            const match = enginesNode.match(/(\d+)/);
            if (match) nodeVersion = match[1];
          }
        }
      } catch {}

      // ── Check if CI already exists ────────────────────────────
      const ciDir = `${projectPath}/.github/workflows`;
      const ciFile = `${ciDir}/ci.yml`;
      if (existsSync(ciFile)) {
        console.log(chalk.yellow('\n  ⚠  .github/workflows/ci.yml already exists'));
        console.log(chalk.gray('  Generating as ci-devdock.yml instead\n'));
      }

      // ── Generate with AI ──────────────────────────────────────
      const aiSpinner = ora('AI is generating your CI workflow...').start();

      try {
        const config = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
        const groq = new Groq({ apiKey: config.groqApiKey });

        const prompt = `You are a senior DevOps engineer. Generate a production-ready GitHub Actions CI workflow YAML file.

PROJECT DETAILS:
- Name: ${analysis.name}
- Stack: ${analysis.stack}
- Node.js version: ${nodeVersion}
- Package manager: ${analysis.packageManager}
- Services needed: ${analysis.services.join(', ') || 'none'}
- Scripts available: ${JSON.stringify(packageJson.scripts || {})}
- Has existing Docker: ${analysis.hasDocker}
- Environment variables needed: ${Object.keys(analysis.envVars).slice(0, 10).join(', ')}

REQUIREMENTS:
1. Trigger on push to main and pull_request to main
2. Use ubuntu-latest
3. Set up correct Node.js version with caching
4. Install dependencies with correct package manager (${analysis.packageManager})
${analysis.services.includes('postgres') ? '5. Start PostgreSQL service with health check' : ''}
${analysis.services.includes('redis') ? '6. Start Redis service with health check' : ''}
${analysis.services.includes('mongodb') ? '7. Start MongoDB service with health check' : ''}
7. Set up all required environment variables as GitHub secrets
8. Run lint if script exists
9. Run tests if test script exists
10. Add build step if build script exists
11. Use proper service container health checks with retry logic
12. Cache node_modules for faster builds

Generate ONLY the YAML content. No explanation. No markdown code blocks. Just raw YAML starting with 'name:'.`;

        const response = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          max_tokens: 2000
        });

        let ciContent = response.choices[0].message.content;

        // Strip markdown code blocks if AI added them
        ciContent = ciContent.replace(/^```ya?ml\n?/gm, '').replace(/^```\n?/gm, '').trim();

        aiSpinner.succeed('CI workflow generated');

        // ── Write file ────────────────────────────────────────
        const writeSpinner = ora('Writing workflow file...').start();

        mkdirSync(ciDir, { recursive: true });

        const outputFile = existsSync(ciFile) ? `${ciDir}/ci-devdock.yml` : ciFile;
        writeFileSync(outputFile, ciContent);

        writeSpinner.succeed(`${chalk.green(outputFile.split('/').pop())} created`);

        // ── Summary ───────────────────────────────────────────
        console.log('\n' + chalk.cyan('─'.repeat(55)));
        console.log(chalk.green.bold('\n  ✓ GitHub Actions workflow ready!\n'));
        console.log(chalk.gray('  File     : ') + chalk.white(outputFile));
        console.log(chalk.gray('  Lines    : ') + chalk.white(`${ciContent.split('\n').length} lines`));
        console.log(chalk.gray('  Services : ') + chalk.white(analysis.services.join(', ') || 'none'));
        console.log(chalk.gray('  Node.js  : ') + chalk.white(nodeVersion));

        if (Object.keys(analysis.envVars).length > 0) {
          console.log(chalk.yellow('\n  ⚠  Add these as GitHub Secrets:'));
          Object.keys(analysis.envVars).slice(0, 8).forEach(key => {
            console.log(chalk.gray(`     • ${key}`));
          });
          if (Object.keys(analysis.envVars).length > 8) {
            console.log(chalk.gray(`     • ...and ${Object.keys(analysis.envVars).length - 8} more`));
          }
        }

        console.log(chalk.gray('\n  Commit and push to activate:\n'));
        console.log(chalk.white('     git add .github/workflows/'));
        console.log(chalk.white('     git commit -m "ci: add GitHub Actions workflow"'));
        console.log(chalk.white('     git push\n'));
        console.log(chalk.cyan('─'.repeat(55) + '\n'));

      } catch (err) {
        aiSpinner.fail('Generation failed');
        console.error(chalk.red(`\n  ${err.message}\n`));
        process.exit(1);
      }
    });
}
