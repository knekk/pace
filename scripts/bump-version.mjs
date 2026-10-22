// Bump the cache-busting token (?v=...) on every asset URL in index.html.
//
//   node scripts/bump-version.mjs            → ?v=YYYYMMDD-HHMM (UTC)
//   node scripts/bump-version.mjs 1.2.0      → ?v=1.2.0
//
// Run before committing a release. GitHub Pages caches files for 10 minutes and the
// token guarantees a fresh index.html always loads a matching set of CSS/JS files.
import { readFile, writeFile } from 'node:fs/promises';

const file = new URL('../index.html', import.meta.url);

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}-${p(d.getUTCHours())}${p(d.getUTCMinutes())}`;
}

const version = process.argv[2] || stamp();
if (!/^[\w.-]+$/.test(version)) {
  console.error(`Invalid version "${version}" – use letters, digits, ".", "-" or "_".`);
  process.exit(1);
}

const html = await readFile(file, 'utf8');
const matches = html.match(/\?v=[\w.-]+/g) || [];
if (matches.length === 0) {
  console.error('No ?v= tokens found in index.html');
  process.exit(1);
}
const previous = new Set(matches.map((m) => m.slice(3)));
const updated = html.replace(/\?v=[\w.-]+/g, `?v=${version}`);
await writeFile(file, updated);
console.log(`index.html: ${matches.length} asset URL(s) ${[...previous].join(', ')} → ${version}`);
