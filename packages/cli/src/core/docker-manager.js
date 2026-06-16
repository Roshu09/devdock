import Docker from 'dockerode';
import { SERVICE_IMAGES, DEFAULT_PORTS } from '../shared/index.js';
import { createWriteStream } from 'fs';
import detectPort from "detect-port";

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

export class DockerManager {
  constructor(projectName) {
    this.projectName = projectName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    this.networkName = `devdock-${this.projectName}`;
  }

  // Check Docker is running
  async ping() {
    try {
      await docker.ping();
      return true;
    } catch {
      return false;
    }
  }

  // Pull image if not present locally
  async pullImageIfNeeded(image) {
    const images = await docker.listImages();
    const exists = images.some(img =>
      img.RepoTags && img.RepoTags.includes(image)
    );
    if (exists) return;

    return new Promise((resolve, reject) => {
      docker.pull(image, (err, stream) => {
        if (err) return reject(err);
        docker.modem.followProgress(stream, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  // Create or get devdock network
  async ensureNetwork() {
    const networks = await docker.listNetworks();
    const exists = networks.find(n => n.Name === this.networkName);
    if (!exists) {
      await docker.createNetwork({ Name: this.networkName });
    }
    return this.networkName;
  }

  // Find a free port (avoid conflicts across projects)
  async getFreePort(defaultPort) {
    const port = await detectPort(defaultPort);
    return port;
  }

  // Start a single service container
  async startService(serviceName, overridePort = null) {
    await this.ensureNetwork();
    const image = SERVICE_IMAGES[serviceName];
    const defaultPort = DEFAULT_PORTS[serviceName];

    if (!image || !defaultPort) {
      throw new Error(`Unknown service: ${serviceName}`);
    }

    const containerName = `devdock-${this.projectName}-${serviceName}`;

    // Check if already running
    const existing = await this._getContainer(containerName);
    if (existing) {
      const info = await existing.inspect();
      if (info.State.Running) {
        return {
          service: serviceName,
          port: info.NetworkSettings.Ports[`${defaultPort}/tcp`]?.[0]?.HostPort || defaultPort,
          status: 'already_running',
          containerName
        };
      }
      // Exists but stopped — start it
      await existing.start();
      return { service: serviceName, port: defaultPort, status: 'restarted', containerName };
    }

    // Find free port
    const hostPort = overridePort || await this.getFreePort(defaultPort);

    // Pull image
    await this.pullImageIfNeeded(image);

    // Build env vars per service
    const envVars = this._getServiceEnv(serviceName);

    // Create and start container
    const container = await docker.createContainer({
      Image: image,
      name: containerName,
      Env: envVars,
      ExposedPorts: { [`${defaultPort}/tcp`]: {} },
      HostConfig: {
        PortBindings: {
          [`${defaultPort}/tcp`]: [{ HostPort: String(hostPort) }]
        },
        RestartPolicy: { Name: 'unless-stopped' }
      },
      NetworkingConfig: {
        EndpointsConfig: {
          [this.networkName]: {}
        }
      },
      Labels: {
        'devdock': 'true',
        'devdock.project': this.projectName,
        'devdock.service': serviceName
      }
    });

    await container.start();

    return {
      service: serviceName,
      port: hostPort,
      status: 'started',
      containerName,
      image
    };
  }

  // Start all services for a project
  async startServices(services) {
    await this.ensureNetwork();
    const results = [];

    for (const service of services) {
      const result = await this.startService(service);
      results.push(result);
    }

    return results;
  }

  // Stop all devdock containers for this project
  async stopServices() {
    const containers = await docker.listContainers({
      all: true,
      filters: JSON.stringify({
        label: [`devdock.project=${this.projectName}`]
      })
    });

    const results = [];
    for (const c of containers) {
      const container = docker.getContainer(c.Id);
      if (c.State === 'running') await container.stop();
      results.push({ name: c.Names[0], status: 'stopped' });
    }

    return results;
  }

  // Get status of all project containers
  async getStatus() {
    const containers = await docker.listContainers({
      all: true,
      filters: JSON.stringify({
        label: [`devdock.project=${this.projectName}`]
      })
    });

    return containers.map(c => ({
      name: c.Names[0].replace('/', ''),
      service: c.Labels['devdock.service'],
      status: c.State,
      ports: c.Ports.map(p => `${p.PublicPort}→${p.PrivatePort}`).join(', '),
      image: c.Image
    }));
  }

  // Helper — get container by name
  async _getContainer(name) {
    const containers = await docker.listContainers({ all: true });
    const found = containers.find(c => c.Names.includes(`/${name}`));
    if (!found) return null;
    return docker.getContainer(found.Id);
  }

  // Service-specific env vars
  _getServiceEnv(service) {
    const envMap = {
      postgres: [
        'POSTGRES_USER=devdock',
        'POSTGRES_PASSWORD=devdock',
        'POSTGRES_DB=devdock'
      ],
      redis: [],
      mongodb: [
        'MONGO_INITDB_ROOT_USERNAME=devdock',
        'MONGO_INITDB_ROOT_PASSWORD=devdock'
      ],
      mysql: [
        'MYSQL_ROOT_PASSWORD=devdock',
        'MYSQL_DATABASE=devdock',
        'MYSQL_USER=devdock',
        'MYSQL_PASSWORD=devdock'
      ],
      rabbitmq: [
        'RABBITMQ_DEFAULT_USER=devdock',
        'RABBITMQ_DEFAULT_PASS=devdock'
      ]
    };
    return envMap[service] || [];
  }
}
