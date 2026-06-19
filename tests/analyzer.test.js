import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { ProjectAnalyzer } from '../packages/core/src/analyzer.js';

const TMP = '/tmp/devdock-test-projects';

function createProject(name, files) {
  const dir = join(TMP, name);
  mkdirSync(dir, { recursive: true });
  for (const [filename, content] of Object.entries(files)) {
    writeFileSync(join(dir, filename), typeof content === 'string' ? content : JSON.stringify(content, null, 2));
  }
  return dir;
}

beforeAll(() => mkdirSync(TMP, { recursive: true }));
afterAll(() => rmSync(TMP, { recursive: true, force: true }));

describe('ProjectAnalyzer — stack detection', () => {
  it('detects Node.js stack from package.json', () => {
    const dir = createProject('node-basic', {
      'package.json': { name: 'test-app', dependencies: {} }
    });
    const result = new ProjectAnalyzer(dir).analyze();
    expect(result.stack).toBe('node');
  });

  it('detects Python stack from requirements.txt', () => {
    const dir = createProject('python-basic', {
      'requirements.txt': 'flask\nrequests\n'
    });
    const result = new ProjectAnalyzer(dir).analyze();
    expect(result.stack).toBe('python');
  });

  it('detects Go stack from go.mod', () => {
    const dir = createProject('go-basic', {
      'go.mod': 'module myapp\ngo 1.21\n'
    });
    const result = new ProjectAnalyzer(dir).analyze();
    expect(result.stack).toBe('go');
  });

  it('detects PHP stack from composer.json', () => {
    const dir = createProject('php-basic', {
      'composer.json': { name: 'test/app', require: {} }
    });
    const result = new ProjectAnalyzer(dir).analyze();
    expect(result.stack).toBe('php');
  });

  it('returns unknown for empty directory', () => {
    const dir = createProject('empty', {});
    const result = new ProjectAnalyzer(dir).analyze();
    expect(result.stack).toBe('unknown');
  });
});

describe('ProjectAnalyzer — service detection from dependencies', () => {
  it('detects postgres from pg dependency', () => {
    const dir = createProject('node-pg', {
      'package.json': { name: 'test', dependencies: { pg: '^8.0.0' } }
    });
    const result = new ProjectAnalyzer(dir).analyze();
    expect(result.services).toContain('postgres');
  });

  it('detects redis from ioredis dependency', () => {
    const dir = createProject('node-redis', {
      'package.json': { name: 'test', dependencies: { ioredis: '^5.0.0' } }
    });
    const result = new ProjectAnalyzer(dir).analyze();
    expect(result.services).toContain('redis');
  });

  it('detects mongodb from mongoose dependency', () => {
    const dir = createProject('node-mongo', {
      'package.json': { name: 'test', dependencies: { mongoose: '^7.0.0' } }
    });
    const result = new ProjectAnalyzer(dir).analyze();
    expect(result.services).toContain('mongodb');
  });

  it('detects redis from bullmq dependency', () => {
    const dir = createProject('node-bullmq', {
      'package.json': { name: 'test', dependencies: { bullmq: '^4.0.0' } }
    });
    const result = new ProjectAnalyzer(dir).analyze();
    expect(result.services).toContain('redis');
  });

  it('detects multiple services correctly', () => {
    const dir = createProject('node-multi', {
      'package.json': {
        name: 'test',
        dependencies: { pg: '^8.0.0', redis: '^4.0.0', mongoose: '^7.0.0' }
      }
    });
    const result = new ProjectAnalyzer(dir).analyze();
    expect(result.services).toContain('postgres');
    expect(result.services).toContain('redis');
    expect(result.services).toContain('mongodb');
  });

  it('detects no services for a basic express app', () => {
    const dir = createProject('node-express', {
      'package.json': { name: 'test', dependencies: { express: '^4.0.0' } }
    });
    const result = new ProjectAnalyzer(dir).analyze();
    expect(result.services).toHaveLength(0);
  });
});

describe('ProjectAnalyzer — service detection from .env.example', () => {
  it('detects postgres from DATABASE_URL in .env.example', () => {
    const dir = createProject('env-pg', {
      'package.json': { name: 'test', dependencies: {} },
      '.env.example': 'DATABASE_URL=postgresql://localhost:5432/mydb\nPORT=3000\n'
    });
    const result = new ProjectAnalyzer(dir).analyze();
    expect(result.services).toContain('postgres');
  });

  it('detects redis from REDIS_URL in .env.example', () => {
    const dir = createProject('env-redis', {
      'package.json': { name: 'test', dependencies: {} },
      '.env.example': 'REDIS_URL=redis://localhost:6379\n'
    });
    const result = new ProjectAnalyzer(dir).analyze();
    expect(result.services).toContain('redis');
  });

  it('detects mongodb from MONGODB_URI in .env.example', () => {
    const dir = createProject('env-mongo', {
      'package.json': { name: 'test', dependencies: {} },
      '.env.example': 'MONGODB_URI=mongodb://localhost:27017/mydb\n'
    });
    const result = new ProjectAnalyzer(dir).analyze();
    expect(result.services).toContain('mongodb');
  });
});

describe('ProjectAnalyzer — env var parsing', () => {
  it('parses all env vars from .env.example', () => {
    const dir = createProject('env-parse', {
      'package.json': { name: 'test', dependencies: {} },
      '.env.example': 'PORT=3000\nNODE_ENV=development\nJWT_SECRET=\n'
    });
    const result = new ProjectAnalyzer(dir).analyze();
    expect(result.envVars).toHaveProperty('PORT', '3000');
    expect(result.envVars).toHaveProperty('NODE_ENV', 'development');
    expect(result.envVars).toHaveProperty('JWT_SECRET', '');
  });

  it('ignores comments in .env.example', () => {
    const dir = createProject('env-comments', {
      'package.json': { name: 'test', dependencies: {} },
      '.env.example': '# This is a comment\nPORT=3000\n# Another comment\nHOST=localhost\n'
    });
    const result = new ProjectAnalyzer(dir).analyze();
    expect(Object.keys(result.envVars)).toHaveLength(2);
    expect(result.envVars).toHaveProperty('PORT');
    expect(result.envVars).toHaveProperty('HOST');
  });
});

describe('ProjectAnalyzer — docker detection', () => {
  it('detects existing docker-compose.yml', () => {
    const dir = createProject('docker-compose', {
      'package.json': { name: 'test', dependencies: {} },
      'docker-compose.yml': 'version: "3"\nservices:\n  app:\n    image: node\n'
    });
    const result = new ProjectAnalyzer(dir).analyze();
    expect(result.hasDocker).toBe(true);
  });

  it('detects existing Dockerfile', () => {
    const dir = createProject('dockerfile', {
      'package.json': { name: 'test', dependencies: {} },
      'Dockerfile': 'FROM node:20\nWORKDIR /app\n'
    });
    const result = new ProjectAnalyzer(dir).analyze();
    expect(result.hasDocker).toBe(true);
  });

  it('returns false when no docker files exist', () => {
    const dir = createProject('no-docker', {
      'package.json': { name: 'test', dependencies: {} }
    });
    const result = new ProjectAnalyzer(dir).analyze();
    expect(result.hasDocker).toBe(false);
  });
});

describe('ProjectAnalyzer — package manager detection', () => {
  it('detects yarn from yarn.lock', () => {
    const dir = createProject('yarn-project', {
      'package.json': { name: 'test', dependencies: {} },
      'yarn.lock': '# yarn lockfile v1\n'
    });
    const result = new ProjectAnalyzer(dir).analyze();
    expect(result.packageManager).toBe('yarn');
  });

  it('detects pnpm from pnpm-lock.yaml', () => {
    const dir = createProject('pnpm-project', {
      'package.json': { name: 'test', dependencies: {} },
      'pnpm-lock.yaml': 'lockfileVersion: 6\n'
    });
    const result = new ProjectAnalyzer(dir).analyze();
    expect(result.packageManager).toBe('pnpm');
  });

  it('defaults to npm when no lockfile found', () => {
    const dir = createProject('npm-project', {
      'package.json': { name: 'test', dependencies: {} }
    });
    const result = new ProjectAnalyzer(dir).analyze();
    expect(result.packageManager).toBe('npm');
  });
});
