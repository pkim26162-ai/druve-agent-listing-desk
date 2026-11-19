// Live evaluation of 매물 데스크 against a real model. YOU run this in your own terminal, so the key
// never has to be pasted into a chat. The key is read from the environment, never written to disk
// and never printed.
//
//   ANTHROPIC_API_KEY=<your key> node eval/run.mjs --provider anthropic [--model claude-sonnet-5-5] [--only L01,C02]
//   OPENROUTER_API_KEY=<your key> node eval/run.mjs --provider openrouter --model openai/gpt-4o-mini
//   node eval/run.mjs --provider echo        (no key, no network: only checks the plumbing)
//
// Writes eval/results.md: every case side by side with automatic checks, for a native Korean reader
// to score. Also prints the number of model calls and characters per path, so cost can be MEASURED.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getModelClient } from '@druve/cli/providers';
import { handleMessage, route } from '../index.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};
const provider = opt('provider', 'echo');
const model = opt('model');
const only = opt('only') ? new Set(opt('only').split(',')) : null;

const keyVar = provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : provider === 'openrouter' ? 'OPENROUTER_API_KEY' : null;
if (keyVar && !process.env[keyVar]) {
  console.error(`Set ${keyVar} in your terminal first (it is read from the environment and never saved).`);
  process.exit(1);
}
const config = { provider };
if (keyVar) config.credential = process.env[keyVar];
if (model) config.model = model;

const real = getModelClient(config);
let calls = 0;
let promptChars = 0;
let outChars = 0;
const BROKER = Symbol.for('druve.broker');
globalThis[BROKER] = {
  async complete(prompt) {
    calls += 1;
    promptChars += prompt.length;
    const out = await real.complete(prompt);
    outChars += String(out).length;
    return out;
  },
};

const cases = JSON.parse(fs.readFileSync(path.join(here, 'cases.json'), 'utf8')).cases.filter((c) => !only || only.has(c.id));
const rows = [];
const perPath = {};
for (const c of cases) {
  const before = { calls, promptChars, outChars };
  const t0 = Date.now();
  let output;
  let error = null;
  try {
    output = await handleMessage(c.input, config);
  } catch (e) {
    error = String(e?.message ?? e).replace(config.credential ?? '\u0000', '[key]');
    output = '';
  }
  const ms = Date.now() - t0;
  const used = { calls: calls - before.calls, promptChars: promptChars - before.promptChars, outChars: outChars - before.outChars };
  const gotRoute = route(c.input).path;
  const checks = [];
  checks.push(gotRoute === c.route ? '✓ route' : `✗ route (got ${gotRoute}, want ${c.route})`);
  for (const s of c.mustAppear) checks.push(output.includes(s) ? `✓ has "${s}"` : `✗ missing "${s}"`);
  for (const s of c.mustNotAppear) checks.push(output.includes(s) ? `✗ contains "${s}"` : `✓ no "${s}"`);
  if (output.includes('—')) checks.push('✗ em dash');
  if (!output.includes('책임은 사장님에게 있어요') && !['decline', 'ask'].includes(c.route)) checks.push('✗ no responsibility line');
  if (ms > 55000) checks.push(`✗ slow (${Math.round(ms / 1000)}s, the browser cuts runs at 60s)`);
  rows.push({ c, output, checks, used, ms, error });
  const p = (perPath[c.route] ??= { n: 0, calls: 0, promptChars: 0, outChars: 0, ms: 0 });
  p.n += 1; p.calls += used.calls; p.promptChars += used.promptChars; p.outChars += used.outChars; p.ms += ms;
  console.log(`${c.id} ${c.route} ${used.calls} calls ${Math.round(ms / 100) / 10}s ${checks.some((x) => x.startsWith('✗')) ? 'CHECK' : 'ok'}`);
}

const fails = rows.filter((r) => r.checks.some((x) => x.startsWith('✗')) || r.error);
let md = `# 매물 데스크 live evaluation\n\nProvider: ${provider}${model ? ` / ${model}` : ''}. Cases run: ${rows.length}. With a failed automatic check or an error: ${fails.length}.\n\n`;
md += `## Measured cost shape (this run only)\n\n| path | cases | model calls | prompt chars | output chars | avg seconds |\n|---|---|---|---|---|---|\n`;
for (const [k, v] of Object.entries(perPath)) {
  md += `| ${k} | ${v.n} | ${v.calls} (${(v.calls / v.n).toFixed(1)} per case) | ${v.promptChars} | ${v.outChars} | ${(v.ms / v.n / 1000).toFixed(1)} |\n`;
}
md += `\nCharacters are not tokens. Check the provider dashboard for real token counts and money.\n\n`;
md += `## Reader score key\n\nFor each case a native Korean reader fills "score" 1 to 5: 1 = unusable or invented a fact, 3 = fine but stiff, 5 = sounds like a real 사장님. Mark any invented fact as FAIL.\n\n`;
for (const r of rows) {
  md += `---\n\n### ${r.c.id} (${r.c.route})  ${r.c.note}\n\n**Input**\n\n\`\`\`\n${r.c.input || '(empty)'}\n\`\`\`\n\n**Automatic checks:** ${r.checks.join(' · ')}\n\n`;
  md += `**Calls:** ${r.used.calls}, **time:** ${Math.round(r.ms / 100) / 10}s${r.error ? `, **error:** ${r.error}` : ''}\n\n**Output**\n\n\`\`\`\n${r.output}\n\`\`\`\n\n**score (1-5):** ____   **invented a fact? (Y/N):** ____   **notes:** \n\n`;
}
fs.writeFileSync(path.join(here, 'results.md'), md);
console.log(`\nWrote eval/results.md. ${fails.length} of ${rows.length} cases have a failed check or error.`);
