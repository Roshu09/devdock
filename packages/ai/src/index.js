import Groq from 'groq-sdk';
import { readFileSync, existsSync } from 'fs';
import { CONFIG_FILE } from '@devdock/shared';

function getGroqClient() {
  if (!existsSync(CONFIG_FILE)) {
    throw new Error('devdock not initialized. Run: devdock init');
  }
  const config = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
  if (!config.groqApiKey) {
    throw new Error('Groq API key missing. Run: devdock init');
  }
  return new Groq({ apiKey: config.groqApiKey });
}

export async function diagnose({ projectName, stack, services, containerStatuses, errorLog, envVars }) {
  const groq = getGroqClient();

  const prompt = `You are devdock's AI diagnosis engine — an expert in local dev environment issues.

A developer is having trouble with their local dev environment. Analyze the situation and provide a clear diagnosis.

PROJECT CONTEXT:
- Name: ${projectName}
- Stack: ${stack}
- Expected services: ${services.join(', ')}

CONTAINER STATUS:
${containerStatuses.map(c => `- ${c.service}: ${c.status} (ports: ${c.ports || 'none'})`).join('\n')}

ENV VARS PRESENT: ${envVars.length} variables found
${envVars.slice(0, 10).join('\n')}

${errorLog ? `ERROR OUTPUT:\n${errorLog}` : 'No error log provided.'}

Respond in this EXACT format:

DIAGNOSIS:
[2-3 sentences explaining what is wrong and why]

ROOT CAUSE:
[1 sentence — the single most likely root cause]

FIX STEPS:
1. [Specific command or action]
2. [Specific command or action]
3. [Specific command or action]

PREVENTION:
[1 sentence tip to avoid this in future]`;

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 600
  });

  return response.choices[0].message.content;
}

export async function inferEnvVars({ projectName, stack, existingVars, services }) {
  const groq = getGroqClient();

  const prompt = `You are a dev environment expert. A ${stack} project named "${projectName}" uses these services: ${services.join(', ')}.

These env vars are present but empty or missing values:
${existingVars.map(([k, v]) => `${k}=${v || '<empty>'}`).join('\n')}

For each empty var, suggest a sensible default value for LOCAL DEVELOPMENT ONLY.
Respond ONLY with valid .env format lines. No explanations. No markdown.
Example:
JWT_SECRET=dev_secret_change_in_production
PORT=3000`;

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 400
  });

  return response.choices[0].message.content;
}
