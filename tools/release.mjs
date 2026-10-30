#!/usr/bin/env node
// Prepares a release (docs/development.md): sets every ?v= in index.html and
// themes/themes.js to the new version, so that kiosks fetch the new files and
// Settings shows it, and the integration's version in its manifest.json, and
// turns the Unreleased section of CHANGELOG.md into that version's, dated
// today, with a new empty Unreleased above it.
// No dependencies.   Usage: node tools/release.mjs 1.2.0
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const write = (file, text) => fs.writeFileSync(path.join(ROOT, file), text);
const fail = (why) => { console.error(why); process.exit(1); };

const version = process.argv[2] || '';
if (!/^\d+\.\d+\.\d+$/.test(version)) fail('usage: node tools/release.mjs 1.2.0');

const log = read('CHANGELOG.md');
if (log.includes(`\n## ${version} `)) fail(`CHANGELOG.md already has ${version}`);
const notes = (log.split(/^## Unreleased\n/m)[1] || '').split(/^## /m)[0];
if (!notes.trim()) fail('CHANGELOG.md has nothing under "## Unreleased" to release');

for (const file of ['index.html', 'themes/themes.js']) write(file, read(file).replace(/\?v=[0-9.]+/g, `?v=${version}`));
const MANIFEST = 'custom_components/kiosk_dashboard/manifest.json';
write(MANIFEST, read(MANIFEST).replace(/"version": "[0-9.]+"/, `"version": "${version}"`));
const today = new Date().toISOString().slice(0, 10);
write('CHANGELOG.md', log.replace(/^## Unreleased\n/m, `## Unreleased\n\n## ${version} - ${today}\n`));

console.log(`index.html, themes/themes.js, the integration and CHANGELOG.md are at ${version}. Next:
  git commit -am "Release ${version}"   (through a pull request, as any change)
  once it is in main:  git tag v${version} && git push origin v${version}`);
