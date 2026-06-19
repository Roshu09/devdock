const homeDir = process.env.HOME || process.env.USERPROFILE || require('os').homedir();
export const DEVDOCK_DIR = `${homeDir}/.devdock`;
export const PROJECTS_FILE = `${DEVDOCK_DIR}/projects.json`;
export const CONFIG_FILE = `${DEVDOCK_DIR}/config.json`;

export const SUPPORTED_STACKS = {
  NODE: 'node',
  PYTHON: 'python',
  PHP: 'php',
  GO: 'go',
  UNKNOWN: 'unknown'
};

export const SERVICE_IMAGES = {
  postgres: 'postgres:15-alpine',
  redis: 'redis:7-alpine',
  mongodb: 'mongo:7',
  mysql: 'mysql:8',
  rabbitmq: 'rabbitmq:3-management-alpine'
};

export const DEFAULT_PORTS = {
  postgres: 5432,
  redis: 6379,
  mongodb: 27017,
  mysql: 3306,
  rabbitmq: 5672
};
