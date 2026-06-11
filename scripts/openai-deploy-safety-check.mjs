#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const targets = ['package-lock.json', 'package.json', '.npmrc'];
const forbidden = /applied[-]caas|internal[.]api|openai[.]org|api[.]openai[.]com|OPENAI_API_KEY/i;
const errors = [];
for (const target of targets) {
  const file = path.join(root, target);
  if (!fs.existsSync(file)) continue;
  const source = fs.readFileSync(file, 'utf8');
  if (forbidden.test(source)) errors.push(`${target}: OpenAI/internal registry or API reference detected`);
}
if (errors.length) {
  console.error('openai:check failed');
  errors.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}
console.log('openai:check passed');
console.log('OpenAI/internal registry references: 0');
