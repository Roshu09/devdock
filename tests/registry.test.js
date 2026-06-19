import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { mkdirSync, rmSync } from 'fs';
import { Registry } from '../packages/core/src/registry.js';

const TEST_DIR = '/tmp/devdock-registry-test';

beforeEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

const makeRegistry = () => new Registry(TEST_DIR);

describe('Registry', () => {
  it('creates projects file if it does not exist', () => {
    const registry = makeRegistry();
    expect(registry.getAll()).toEqual([]);
  });

  it('registers a new project', () => {
    const registry = makeRegistry();
    registry.register('/my/project', {
      name: 'my-project', stack: 'node', services: ['postgres', 'redis']
    }, [
      { service: 'postgres', port: 5432 },
      { service: 'redis', port: 6379 }
    ]);
    const projects = registry.getAll();
    expect(projects).toHaveLength(1);
    expect(projects[0].name).toBe('my-project');
    expect(projects[0].stack).toBe('node');
    expect(projects[0].services).toContain('postgres');
    expect(projects[0].services).toContain('redis');
  });

  it('updates existing project on re-register', () => {
    const registry = makeRegistry();
    registry.register('/my/project', {
      name: 'my-project', stack: 'node', services: ['postgres']
    }, [{ service: 'postgres', port: 5432 }]);
    registry.register('/my/project', {
      name: 'my-project', stack: 'node', services: ['postgres', 'redis']
    }, [
      { service: 'postgres', port: 5432 },
      { service: 'redis', port: 6379 }
    ]);
    const projects = registry.getAll();
    expect(projects).toHaveLength(1);
    expect(projects[0].services).toContain('redis');
  });

  it('finds project by path', () => {
    const registry = makeRegistry();
    registry.register('/my/project', {
      name: 'my-project', stack: 'node', services: ['postgres']
    }, [{ service: 'postgres', port: 5432 }]);
    const found = registry.getByPath('/my/project');
    expect(found).toBeDefined();
    expect(found.name).toBe('my-project');
  });

  it('returns undefined for unknown path', () => {
    const registry = makeRegistry();
    const found = registry.getByPath('/nonexistent/path');
    expect(found).toBeUndefined();
  });

  it('removes a project', () => {
    const registry = makeRegistry();
    registry.register('/my/project', {
      name: 'my-project', stack: 'node', services: []
    }, []);
    registry.remove('/my/project');
    expect(registry.getAll()).toHaveLength(0);
  });

  it('stores port mapping correctly', () => {
    const registry = makeRegistry();
    registry.register('/my/project', {
      name: 'my-project', stack: 'node', services: ['postgres']
    }, [{ service: 'postgres', port: 5433 }]);
    const project = registry.getByPath('/my/project');
    expect(project.ports.postgres).toBe(5433);
  });

  it('persists data across instances', () => {
    const registry1 = makeRegistry();
    registry1.register('/my/project', {
      name: 'my-project', stack: 'node', services: ['redis']
    }, [{ service: 'redis', port: 6379 }]);

    const registry2 = makeRegistry();
    expect(registry2.getAll()).toHaveLength(1);
    expect(registry2.getAll()[0].name).toBe('my-project');
  });
});
