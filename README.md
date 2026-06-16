<div align="center">
██████╗ ███████╗██╗   ██╗██████╗  ██████╗  ██████╗██╗  ██╗

██╔══██╗██╔════╝██║   ██║██╔══██╗██╔═══██╗██╔════╝██║ ██╔╝

██║  ██║█████╗  ██║   ██║██║  ██║██║   ██║██║     █████╔╝

██║  ██║██╔══╝  ╚██╗ ██╔╝██║  ██║██║   ██║██║     ██╔═██╗

██████╔╝███████╗ ╚████╔╝ ██████╔╝╚██████╔╝╚██████╗██║  ██╗

╚═════╝ ╚══════╝  ╚═══╝  ╚═════╝  ╚═════╝  ╚═════╝╚═╝  ╚═╝

**AI-powered local dev environment manager**

[![npm version](https://img.shields.io/npm/v/devdock?color=cyan&style=flat-square)](https://www.npmjs.com/package/devdock)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen?style=flat-square)](https://nodejs.org)

</div>

---

## The Problem

You clone a repo. You spend the next 2 hours:
- Installing the right Node version
- Figuring out which Docker services to spin up
- Hunting for `.env` values that aren't documented
- Debugging port conflicts with your other project
- Googling why Postgres won't connect

**devdock fixes all of this with one command.**

```bash
$ devdock up
```

---

## Demo

> `devdock up` on a real MERN + Postgres + Redis project
⚡ devdock up — docmind-saas
✔ Detected node project — 2 service(s) needed

✔ Docker is ready
Services to start: postgres, redis
✔ postgres started on port 5432

✔ redis started on port 6379

✔ .env created with 40 variables
╭─────────────────────────────────────────────╮

│                                             │

│   ✓ devdock up — everything is running      │

│                                             │

│     Project : docmind-saas                  │

│     Stack   : node                          │

│                                             │

│     Services:                               │

│       • postgres    localhost:5432          │

│       • redis       localhost:6379          │

│                                             │

│     Next: install deps and start your app   │

│     Stop: devdock down                      │

│                                             │

╰─────────────────────────────────────────────╯

> `devdock doctor` — AI diagnoses a broken environment
🩺 devdock doctor — AI diagnosis
✔ Diagnosis complete
DIAGNOSIS

The postgres container is running but the application cannot connect.

DB_HOST is set to 'localhost' but the container expects '127.0.0.1'

on this system configuration.
ROOT CAUSE

Mismatch between DB_HOST value in .env and the actual container

network binding on this machine.
FIX STEPS

Open .env and change DB_HOST=localhost to DB_HOST=127.0.0.1
Restart your application: npm run dev
Verify connection: devdock status

PREVENTION TIP

Always use 127.0.0.1 instead of localhost for Docker port bindings

on Linux systems to avoid IPv6/IPv4 resolution issues.

---

## Install

```bash
npm install -g devdock
devdock init
```

Requires: **Node.js 18+**, **Docker**

Get a free Groq API key at [console.groq.com](https://console.groq.com) — needed for `devdock doctor`.

---

## Commands

| Command | Description |
|---------|-------------|
| `devdock init` | One-time setup — configure your Groq API key |
| `devdock up [path]` | Analyze project + spin up all required services |
| `devdock down [path]` | Stop all services for a project |
| `devdock status [path]` | Show live container health and ports |
| `devdock doctor [path]` | AI-powered diagnosis of environment issues |
| `devdock switch` | Switch dev environment between projects |
| `devdock list` | List all projects managed by devdock |

---

## How It Works
Your Repo

│

▼

┌─────────────────────────────┐

│      Project Analyzer       │  reads package.json, .env.example,

│                             │  Dockerfile, requirements.txt

└────────────┬────────────────┘

│ detects stack + services needed

▼

┌─────────────────────────────┐

│      Docker Manager         │  pulls images, creates network,

│                             │  starts containers on free ports

└────────────┬────────────────┘

│ service URLs + ports

▼

┌─────────────────────────────┐

│      ENV Generator          │  creates .env with correct

│                             │  connection strings auto-filled

└────────────┬────────────────┘

│

▼

┌─────────────────────────────┐

│      AI Engine (Groq)       │  diagnoses issues, infers missing

│                             │  config, explains root causes

└─────────────────────────────┘

---

## Supported Stacks

| Stack | Auto-detected via |
|-------|------------------|
| Node.js | `package.json` |
| Python | `requirements.txt`, `pyproject.toml` |
| PHP | `composer.json` |
| Go | `go.mod` |

## Supported Services

| Service | Docker Image |
|---------|-------------|
| PostgreSQL | `postgres:15-alpine` |
| Redis | `redis:7-alpine` |
| MongoDB | `mongo:7` |
| MySQL | `mysql:8` |
| RabbitMQ | `rabbitmq:3-management-alpine` |

---

## Why devdock?

- **Zero config** — point it at any repo, it figures the rest out
- **No docker-compose needed** — devdock manages containers directly
- **Port conflict resolution** — running two projects? devdock finds free ports automatically
- **AI-powered diagnosis** — broken environment? `devdock doctor` tells you exactly what's wrong and how to fix it
- **Project switching** — switch between projects without manually stopping and starting services
- **Lightweight** — no daemon, no background service, just a CLI

---

## Contributing

PRs welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

```bash
git clone https://github.com/YOUR_USERNAME/devdock
cd devdock
npm install
npm link --workspace=packages/cli
devdock --version
```

---

## License

MIT © [Roshan Kumar](https://github.com/YOUR_USERNAME)
