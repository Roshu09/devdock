<div align="center">

<img src="https://raw.githubusercontent.com/Roshu09/devdock/main/assets/logo.png" alt="devdock" width="600"/>

### AI-powered local dev environment manager

*Clone any repo. Run one command. Everything just works.*

<br/>

[![npm](https://img.shields.io/npm/v/devdock-cli?color=00b4d8&style=flat-square&logo=npm&label=npm)](https://www.npmjs.com/package/devdock-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-brightgreen?style=flat-square&logo=nodedotjs)](https://nodejs.org)
[![Docker](https://img.shields.io/badge/Docker-required-blue?style=flat-square&logo=docker)](https://docker.com)
[![CI](https://github.com/Roshu09/devdock/actions/workflows/ci.yml/badge.svg)](https://github.com/Roshu09/devdock/actions)
[![Tests](https://img.shields.io/badge/tests-30%20passing-brightgreen?style=flat-square)](https://github.com/Roshu09/devdock/tree/main/tests)

<br/>

[**Install**](#install) · [**Demo**](#demo) · [**Commands**](#commands) · [**How It Works**](#how-it-works) · [**Contributing**](#contributing)

</div>

---

## The Problem

You clone a repo. You spend the next 2 hours:

- 😤 Figuring out which Docker services to spin up
- 🔍 Hunting for `.env` values that aren't documented
- 🔥 Debugging port conflicts with your other project
- 💀 Googling why Postgres won't connect

**devdock fixes all of this with one command.**

```bash
$ devdock up
```

---

## Demo

<div align="center">

[![devdock demo](https://asciinema.org/a/6Z6ARAHls3nL3JPz.svg)](https://asciinema.org/a/6Z6ARAHls3nL3JPz?speed=1.5)

*Click to watch — `devdock up` on a real Node.js + Postgres + Redis project*

</div>

---

## Install

```bash
npm install -g devdock-cli
devdock init
```

**Requirements:**
- Node.js 18+
- Docker Desktop (Windows/Mac) or Docker Engine (Linux)
- Windows: Docker Desktop must be running
- Free Groq API key → [console.groq.com](https://console.groq.com) *(needed for `devdock doctor`)*

---

## Commands

| Command | Description |
|---|---|
| `devdock init` | One-time setup — saves your Groq API key |
| `devdock up [path]` | ⚡ Auto-detect stack + spin up all services |
| `devdock down [path]` | Stop all services for a project |
| `devdock status [path]` | Live container health + ports |
| `devdock doctor [path]` | 🤖 AI diagnosis of broken environments |
| `devdock switch` | Switch between projects instantly |
| `devdock list` | All projects managed by devdock |

---

## How It Works
Your Repo

│

▼

┌──────────────────────────────────────┐

│  📦 Project Analyzer                 │

│  reads package.json, .env.example,   │

│  Dockerfile, requirements.txt        │

└──────────────────┬───────────────────┘

│ detects stack + services

▼

┌──────────────────────────────────────┐

│  🐳 Docker Manager                   │

│  pulls images, creates network,      │

│  starts containers on free ports     │

└──────────────────┬───────────────────┘

│ service URLs + ports

▼

┌──────────────────────────────────────┐

│  ⚙️  ENV Generator                   │

│  creates .env with connection        │

│  strings auto-filled                 │

└──────────────────┬───────────────────┘

│

▼

┌──────────────────────────────────────┐

│  🤖 AI Engine (Groq / llama-3.3-70b) │

│  diagnoses issues, infers missing    │

│  config, explains root causes        │

└──────────────────────────────────────┘
---

## Supported Stacks

| Stack | Detected via |
|---|---|
| 🟢 Node.js | `package.json` |
| 🐍 Python | `requirements.txt`, `pyproject.toml` |
| 🐘 PHP | `composer.json` |
| 🐹 Go | `go.mod` |

## Supported Services

| Service | Image | Default Port |
|---|---|---|
| 🐘 PostgreSQL | `postgres:15-alpine` | 5432 |
| 🔴 Redis | `redis:7-alpine` | 6379 |
| 🍃 MongoDB | `mongo:7` | 27017 |
| 🐬 MySQL | `mysql:8` | 3306 |
| 🐇 RabbitMQ | `rabbitmq:3-management-alpine` | 5672 |

> **Port conflict resolution built-in** — if 5432 is taken, devdock finds the next free port automatically.

---

## Why devdock?

| Feature | devdock | Manual setup | docker-compose |
|---|---|---|---|
| Auto-detects services | ✅ | ❌ | ❌ |
| Generates .env | ✅ | ❌ | ❌ |
| Port conflict resolution | ✅ | ❌ | ❌ |
| AI diagnosis | ✅ | ❌ | ❌ |
| Multi-project switching | ✅ | ❌ | ❌ |
| Zero config needed | ✅ | ❌ | ❌ |

---

## Contributing

PRs welcome!

```bash
git clone https://github.com/Roshu09/devdock.git
cd devdock
npm install
npm link --workspace=packages/cli
devdock --version
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

---

## Tech Stack

Built with: **Node.js** · **Commander.js** · **Dockerode** · **Groq AI** · **Inquirer.js** · **Chalk** · **Ora**

---

<div align="center">

MIT © [Roshan Kumar](https://github.com/Roshu09) · [npm](https://www.npmjs.com/package/devdock-cli) · [Report a Bug](https://github.com/Roshu09/devdock/issues)

*Built by a developer, for developers* 🚀

</div>
