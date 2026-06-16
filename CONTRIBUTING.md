# Contributing to devdock

Thanks for your interest in contributing!

## Setup

git clone https://github.com/YOUR_USERNAME/devdock
cd devdock
npm install
npm link --workspace=packages/cli

## Project Structure

- packages/cli/    — Commander.js CLI, all commands live here
- packages/core/   — ProjectAnalyzer, DockerManager, EnvGenerator, Registry
- packages/ai/     — Groq integration, diagnosis and env inference
- packages/shared/ — Constants and types shared across packages

## Adding a new command

1. Create packages/cli/src/commands/yourcommand.js
2. Export a default register(program) function
3. Add yourcommand to the commands array in packages/cli/src/index.js

## Submitting a PR

- One feature per PR
- Test your changes with a real project
- Update README if adding new commands or stacks
