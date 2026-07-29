#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

import { parseRaml, renderOas30 } from './raml.mjs';

const cfg = {
  ramlRoot: process.env.RAML_ROOT ?? 'src/main/resources/api/api.raml',
  mode: process.env.MODE ?? 'preview',      // preview | publish | cleanup

};

const repoRoot = process.cwd();

async function main() {
  if (cfg.mode === 'cleanup') return cleanup();

  const head = await parseRaml(cfg.ramlRoot, repoRoot);

  if (!head.conforms) {
    const violations = head.problems.filter((p) => /violation/i.test(p.level));
    if (violations.length) {
      console.error('RAML does not conform:');
      for (const v of violations) console.error(`  ${v.location}:${v.line ?? '?'} ${v.message}`);
      process.exit(1);
    }
  }

  const changed = changedFiles(cfg.baseRef);
  const touched = changed.filter((f) => head.closure.includes(f));
  if (cfg.baseRef && touched.length === 0) {
    console.log('No file in the RAML include closure changed. Nothing to do.');
    console.log(`  closure: ${head.closure.length} files, PR touched ${changed.length}`);
    return;
  }
  console.log(`Contract files touched:\n${touched.map((f) => `  ${f}`).join('\n')}`);


main().catch((e) => { console.error(e); process.exit(1); });
