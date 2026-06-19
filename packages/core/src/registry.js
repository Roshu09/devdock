import { readFileSync, writeFileSync, existsSync } from 'fs';
import { PROJECTS_FILE, DEVDOCK_DIR } from '@devdock/shared';
import { mkdirSync } from 'fs';

export class Registry {
  static testDir = null;
  constructor(customDir = null) {
    const dir = customDir || DEVDOCK_DIR;
    this.projectsFile = customDir ? customDir + '/projects.json' : PROJECTS_FILE;
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    this.data = this._load();
  }

  _load() {
    if (!existsSync(this.projectsFile)) {
      return { projects: [] };
    }
    return JSON.parse(readFileSync(this.projectsFile, 'utf8'));
  }

  _save() {
    writeFileSync(this.projectsFile, JSON.stringify(this.data, null, 2));
  }

  register(projectPath, analysis, services) {
    const existing = this.data.projects.findIndex(p => p.path === projectPath);
    const entry = {
      name: analysis.name,
      path: projectPath,
      stack: analysis.stack,
      services: services.map(s => s.service),
      ports: Object.fromEntries(services.map(s => [s.service, s.port])),
      registeredAt: new Date().toISOString(),
      lastUp: new Date().toISOString()
    };

    if (existing >= 0) {
      this.data.projects[existing] = entry;
    } else {
      this.data.projects.push(entry);
    }

    this._save();
    return entry;
  }

  getAll() {
    return this.data.projects;
  }

  getByPath(path) {
    return this.data.projects.find(p => p.path === path);
  }

  remove(path) {
    this.data.projects = this.data.projects.filter(p => p.path !== path);
    this._save();
  }
}
