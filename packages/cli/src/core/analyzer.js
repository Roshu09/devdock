import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { glob } from 'glob';
import { SUPPORTED_STACKS, SERVICE_IMAGES, DEFAULT_PORTS } from '../shared/index.js';

export class ProjectAnalyzer {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.result = {
      stack: SUPPORTED_STACKS.UNKNOWN,
      services: [],
      envVars: {},
      ports: {},
      name: '',
      hasDocker: false,
      packageManager: 'npm'
    };
  }

  analyze() {
    this.result.name = this.projectPath.split('/').pop();
    this._detectStack();
    this._detectServices();
    this._parseEnvExample();
    this._detectExistingDocker();
    return this.result;
  }

  _detectStack() {
    const checks = [
      { file: 'package.json', stack: SUPPORTED_STACKS.NODE },
      { file: 'requirements.txt', stack: SUPPORTED_STACKS.PYTHON },
      { file: 'pyproject.toml', stack: SUPPORTED_STACKS.PYTHON },
      { file: 'composer.json', stack: SUPPORTED_STACKS.PHP },
      { file: 'go.mod', stack: SUPPORTED_STACKS.GO },
    ];

    for (const { file, stack } of checks) {
      if (existsSync(join(this.projectPath, file))) {
        this.result.stack = stack;

        // Node-specific extras
        if (stack === SUPPORTED_STACKS.NODE) {
          this._analyzePackageJson();
        }
        return;
      }
    }
  }

  _analyzePackageJson() {
    try {
      const pkg = JSON.parse(
        readFileSync(join(this.projectPath, 'package.json'), 'utf8')
      );

      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies
      };

      // Detect package manager
      if (existsSync(join(this.projectPath, 'yarn.lock'))) {
        this.result.packageManager = 'yarn';
      } else if (existsSync(join(this.projectPath, 'pnpm-lock.yaml'))) {
        this.result.packageManager = 'pnpm';
      }

      // Detect services from dependencies
      const serviceMap = {
        postgres: ['pg', 'postgres', 'knex', 'sequelize', 'typeorm', 'prisma', '@prisma/client'],
        redis: ['redis', 'ioredis', 'bullmq', 'bull', 'connect-redis'],
        mongodb: ['mongoose', 'mongodb'],
        mysql: ['mysql', 'mysql2'],
        rabbitmq: ['amqplib', 'amqp-connection-manager']
      };

      for (const [service, packages] of Object.entries(serviceMap)) {
        if (packages.some(pkg => allDeps[pkg])) {
          if (!this.result.services.includes(service)) {
            this.result.services.push(service);
          }
        }
      }

      // Store scripts for later use
      this.result.scripts = pkg.scripts || {};
      this.result.projectName = pkg.name || this.result.name;

    } catch (err) {
      // malformed package.json — skip
    }
  }

  _detectServices() {
    // Also check .env.example for service hints
    const envPath = join(this.projectPath, '.env.example');
    if (!existsSync(envPath)) return;

    const content = readFileSync(envPath, 'utf8').toLowerCase();

    const hints = {
      postgres: ['postgres', 'postgresql', 'pg_', 'database_url'],
      redis: ['redis'],
      mongodb: ['mongo', 'mongodb'],
      mysql: ['mysql'],
      rabbitmq: ['rabbit', 'amqp']
    };

    for (const [service, keywords] of Object.entries(hints)) {
      if (keywords.some(kw => content.includes(kw))) {
        if (!this.result.services.includes(service)) {
          this.result.services.push(service);
        }
      }
    }
  }

  _parseEnvExample() {
    const envPath = join(this.projectPath, '.env.example');
    if (!existsSync(envPath)) return;

    const lines = readFileSync(envPath, 'utf8').split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const [key, ...valueParts] = trimmed.split('=');
      if (key) {
        this.result.envVars[key.trim()] = valueParts.join('=').trim() || '';
      }
    }
  }

  _detectExistingDocker() {
    this.result.hasDocker = existsSync(join(this.projectPath, 'docker-compose.yml')) ||
                            existsSync(join(this.projectPath, 'docker-compose.yaml')) ||
                            existsSync(join(this.projectPath, 'Dockerfile'));
  }
}
