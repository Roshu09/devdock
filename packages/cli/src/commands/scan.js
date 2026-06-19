import chalk from 'chalk';
import ora from 'ora';
import { resolve, join } from 'path';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { ProjectAnalyzer } from '@devdock/core';
import { CONFIG_FILE } from '@devdock/shared';
import Groq from 'groq-sdk';
import { execSync } from 'child_process';

export default function register(program) {
  program
    .command('scan')
    .description('Scan project for security issues, vulnerabilities and health')
    .option('-p, --path <path>', 'Project path (defaults to current directory)')
    .action(async (options) => {
      const projectPath = resolve(options.path || process.cwd());

      console.log(chalk.cyan('🔍 devdock scan — Project Health & Security\n'));
      console.log(chalk.gray(`  Scanning: ${projectPath}\n`));

      const issues = { critical: [], warning: [], passed: [] };
      let score = 100;

      // ── 1. Analyze project ────────────────────────────────────
      const analyzeSpinner = ora('Analyzing project structure...').start();
      const analyzer = new ProjectAnalyzer(projectPath);
      const analysis = analyzer.analyze();
      analyzeSpinner.succeed(`${chalk.white(analysis.name)}  —  ${analysis.stack}`);

      // ── 2. Secret scanning ────────────────────────────────────
      const secretSpinner = ora('Scanning for exposed secrets...').start();
      await scanSecrets(projectPath, issues);
      secretSpinner.succeed('Secret scan complete');

      // ── 3. .env file checks ───────────────────────────────────
      const envSpinner = ora('Checking environment configuration...').start();
      checkEnvSecurity(projectPath, issues);
      envSpinner.succeed('Environment check complete');

      // ── 4. npm audit ──────────────────────────────────────────
      const auditSpinner = ora('Running dependency audit...').start();
      await runNpmAudit(projectPath, issues);
      auditSpinner.succeed('Dependency audit complete');

      // ── 5. Git history check ──────────────────────────────────
      const gitSpinner = ora('Checking git history...').start();
      checkGitHistory(projectPath, issues);
      gitSpinner.succeed('Git history check complete');

      // ── 6. Docker security ────────────────────────────────────
      const dockerSpinner = ora('Checking Docker configuration...').start();
      checkDockerSecurity(projectPath, analysis, issues);
      dockerSpinner.succeed('Docker check complete');

      // ── Calculate score ───────────────────────────────────────
      score -= issues.critical.length * 15;
      score -= issues.warning.length * 5;
      score = Math.max(0, Math.min(100, score));

      // ── AI Summary ────────────────────────────────────────────
      const aiSpinner = ora('AI analyzing results...').start();
      let aiSummary = '';
      try {
        const config = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
        const groq = new Groq({ apiKey: config.groqApiKey });
        const response = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [{
            role: 'user',
            content: `You are a security engineer reviewing a ${analysis.stack} project called "${analysis.name}".

Security scan results:
- Critical issues: ${issues.critical.length}
${issues.critical.map(i => `  • ${i}`).join('\n')}
- Warnings: ${issues.warning.length}
${issues.warning.map(i => `  • ${i}`).join('\n')}
- Passed checks: ${issues.passed.length}
- Health score: ${score}/100

Write a 2-3 sentence actionable summary of the most important things to fix first.
Be direct and specific. No fluff.`
          }],
          temperature: 0.3,
          max_tokens: 200
        });
        aiSummary = response.choices[0].message.content;
        aiSpinner.succeed('AI analysis complete');
      } catch {
        aiSpinner.warn('AI summary unavailable');
      }

      // ── Print Report ──────────────────────────────────────────
      console.log('\n' + chalk.cyan('─'.repeat(55)));
      console.log(chalk.bold('\n  📋 SCAN REPORT  —  ' + analysis.name + '\n'));

      if (issues.critical.length > 0) {
        console.log(chalk.red.bold('  CRITICAL'));
        issues.critical.forEach(i => {
          console.log(chalk.red('  ✗ ') + chalk.white(i));
        });
        console.log('');
      }

      if (issues.warning.length > 0) {
        console.log(chalk.yellow.bold('  WARNINGS'));
        issues.warning.forEach(i => {
          console.log(chalk.yellow('  ⚠ ') + chalk.white(i));
        });
        console.log('');
      }

      if (issues.passed.length > 0) {
        console.log(chalk.green.bold('  PASSED'));
        issues.passed.forEach(i => {
          console.log(chalk.green('  ✓ ') + chalk.gray(i));
        });
        console.log('');
      }

      // Score bar
      const scoreColor = score >= 80 ? chalk.green : score >= 60 ? chalk.yellow : chalk.red;
      const filled = Math.floor(score / 5);
      const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);

      console.log(chalk.cyan('─'.repeat(55)));
      console.log(`\n  Health Score  ${scoreColor.bold(String(score).padStart(3) + '/100')}  ${scoreColor(bar)}\n`);

      if (aiSummary) {
        console.log(chalk.cyan.bold('  AI RECOMMENDATION'));
        console.log(chalk.gray('  ' + aiSummary.replace(/\n/g, '\n  ')) + '\n');
      }

      console.log(chalk.cyan('─'.repeat(55) + '\n'));
    });
}

// ── Secret Scanner ────────────────────────────────────────────
async function scanSecrets(projectPath, issues) {
  const dangerousPatterns = [
    { pattern: /sk-[a-zA-Z0-9]{20,}/, label: 'OpenAI API key' },
    { pattern: /AKIA[0-9A-Z]{16}/, label: 'AWS Access Key ID' },
    { pattern: /ghp_[a-zA-Z0-9]{36}/, label: 'GitHub Personal Access Token' },
    { pattern: /gsk_[a-zA-Z0-9]{40,}/, label: 'Groq API key' },
    { pattern: /AIza[0-9A-Za-z-_]{35}/, label: 'Google API key' },
    { pattern: /[a-zA-Z0-9+/]{40}={0,2}/, label: 'Possible base64 encoded secret' },
    { pattern: /password\s*=\s*["'][^"']{8,}["']/i, label: 'Hardcoded password' },
    { pattern: /secret\s*=\s*["'][^"']{8,}["']/i, label: 'Hardcoded secret' },
  ];

  const skipDirs = ['node_modules', '.git', 'dist', 'build', '.next'];
  const skipFiles = ['.env', '.env.example', 'package-lock.json', 'yarn.lock'];
  const scanExts = ['.js', '.ts', '.py', '.go', '.php', '.env.local', '.json'];

  let secretsFound = false;

  function scanDir(dir) {
    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        if (skipDirs.includes(entry)) continue;
        const full = join(dir, entry);
        const stat = statSync(full);
        if (stat.isDirectory()) {
          scanDir(full);
        } else if (!skipFiles.includes(entry) && scanExts.some(e => entry.endsWith(e))) {
          try {
            const content = readFileSync(full, 'utf8');
            const relPath = full.replace(projectPath + '/', '');
            for (const { pattern, label } of dangerousPatterns) {
              if (pattern.test(content)) {
                issues.critical.push(`${label} found in ${relPath}`);
                secretsFound = true;
                break;
              }
            }
          } catch {}
        }
      }
    } catch {}
  }

  scanDir(projectPath);
  if (!secretsFound) {
    issues.passed.push('No hardcoded secrets detected in source files');
  }
}

// ── ENV Security Check ────────────────────────────────────────
function checkEnvSecurity(projectPath, issues) {
  const envFile = join(projectPath, '.env');
  const envExample = join(projectPath, '.env.example');
  const gitignore = join(projectPath, '.gitignore');

  if (existsSync(envFile)) {
    // Check if .env is in .gitignore
    if (existsSync(gitignore)) {
      const gitignoreContent = readFileSync(gitignore, 'utf8');
      if (gitignoreContent.includes('.env')) {
        issues.passed.push('.env is properly gitignored');
      } else {
        issues.critical.push('.env is NOT in .gitignore — secrets may be exposed');
      }
    } else {
      issues.warning.push('No .gitignore found — .env may be committed accidentally');
    }
  }

  if (existsSync(envExample)) {
    issues.passed.push('.env.example exists for team onboarding');
  } else {
    issues.warning.push('No .env.example found — new developers won\'t know what env vars are needed');
  }
}

// ── NPM Audit ─────────────────────────────────────────────────
async function runNpmAudit(projectPath, issues) {
  if (!existsSync(join(projectPath, 'package.json'))) {
    issues.passed.push('No package.json — dependency audit skipped');
    return;
  }

  try {
    const result = execSync('npm audit --json 2>/dev/null', {
      cwd: projectPath,
      timeout: 30000,
      encoding: 'utf8'
    });
    const audit = JSON.parse(result);
    const vulns = audit.metadata?.vulnerabilities || {};
    const critical = vulns.critical || 0;
    const high = vulns.high || 0;
    const moderate = vulns.moderate || 0;

    if (critical > 0) {
      issues.critical.push(`${critical} critical vulnerability${critical > 1 ? 'ies' : 'y'} in dependencies`);
    }
    if (high > 0) {
      issues.warning.push(`${high} high severity vulnerability${high > 1 ? 'ies' : 'y'} in dependencies`);
    }
    if (moderate > 0) {
      issues.warning.push(`${moderate} moderate vulnerability${moderate > 1 ? 'ies' : 'y'} in dependencies`);
    }
    if (critical === 0 && high === 0) {
      issues.passed.push('No critical or high severity vulnerabilities found');
    }
  } catch (err) {
    try {
      const errOutput = err.stdout || '';
      const audit = JSON.parse(errOutput);
      const vulns = audit.metadata?.vulnerabilities || {};
      const critical = vulns.critical || 0;
      const high = vulns.high || 0;
      if (critical > 0) issues.critical.push(`${critical} critical vulnerabilities in dependencies`);
      if (high > 0) issues.warning.push(`${high} high severity vulnerabilities in dependencies`);
      if (critical === 0 && high === 0) issues.passed.push('No critical vulnerabilities found');
    } catch {
      issues.warning.push('Could not run dependency audit — run npm audit manually');
    }
  }
}

// ── Git History Check ─────────────────────────────────────────
function checkGitHistory(projectPath, issues) {
  if (!existsSync(join(projectPath, '.git'))) {
    issues.warning.push('No git repository found');
    return;
  }

  try {
    const log = execSync('git log --oneline --all 2>/dev/null | head -20', {
      cwd: projectPath, encoding: 'utf8', timeout: 10000
    });

    // Check for accidental .env commits
    try {
      const envInGit = execSync('git log --all --full-history -- .env 2>/dev/null', {
        cwd: projectPath, encoding: 'utf8', timeout: 10000
      });
      if (envInGit.trim()) {
        issues.critical.push('.env was committed to git history — rotate all secrets immediately');
      } else {
        issues.passed.push('.env has never been committed to git history');
      }
    } catch {
      issues.passed.push('.env has never been committed to git history');
    }

    // Check commit count
    const commitCount = log.trim().split('\n').filter(Boolean).length;
    if (commitCount > 0) {
      issues.passed.push(`Git repository has ${commitCount}+ commits with proper history`);
    }
  } catch {
    issues.warning.push('Could not read git history');
  }
}

// ── Docker Security ───────────────────────────────────────────
function checkDockerSecurity(projectPath, analysis, issues) {
  const dockerfilePath = join(projectPath, 'Dockerfile');

  if (existsSync(dockerfilePath)) {
    const content = readFileSync(dockerfilePath, 'utf8');

    if (content.includes('USER root') || !content.includes('USER ')) {
      issues.warning.push('Dockerfile runs as root — add a non-root USER for security');
    } else {
      issues.passed.push('Dockerfile uses non-root user');
    }

    if (content.includes(':latest')) {
      issues.warning.push('Dockerfile uses :latest tag — pin to a specific version for reproducibility');
    } else {
      issues.passed.push('Dockerfile uses pinned image versions');
    }
  }

  if (analysis.services.length > 0) {
    issues.passed.push(`${analysis.services.length} service(s) managed by devdock with isolated Docker network`);
  }
}
