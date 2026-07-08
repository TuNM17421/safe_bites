import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// §0/§16 safety-copy guard. Absolutely-forbidden wording anywhere in shipped code, i18n
// messages, prisma, or the offline shell. Case-insensitive whole-phrase match. This file is
// the ONLY self-exception (it necessarily contains the phrases below).
const DENYLIST = [
  'guaranteed safe',
  '100% safe',
  'allergy-proof',
  'allergy proof',
  'this dish is safe',
  'verified_safe',
];

const SCRIPT = fileURLToPath(import.meta.url);
const WEB_ROOT = resolve(SCRIPT, '../..');
const REPO_ROOT = resolve(SCRIPT, '../../..');

// §16 roots ∪ next-intl messages (phase-02 flag) ∪ PWA offline shell (phase-07 flag).
const SCAN_TARGETS = [
  join(WEB_ROOT, 'src'),
  join(WEB_ROOT, 'prisma'),
  join(WEB_ROOT, 'messages'),
  join(WEB_ROOT, 'public'),
  join(REPO_ROOT, 'packages', 'domain', 'src'),
];

const SCAN_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.prisma', '.html', '.webmanifest']);
const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', 'coverage', '.turbo']);

interface Hit {
  file: string;
  line: number;
  phrase: string;
}

function walk(dir: string, files: string[]): void {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return; // target may not exist (e.g. an empty public/) — skip silently
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (!SKIP_DIRS.has(entry)) walk(full, files);
    } else if (SCAN_EXTENSIONS.has(extname(entry))) {
      files.push(full);
    }
  }
}

function scan(file: string): Hit[] {
  if (basename(file) === basename(SCRIPT)) return []; // self-exception
  const hits: Hit[] = [];
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((raw, i) => {
    const line = raw.toLowerCase();
    for (const phrase of DENYLIST) {
      if (line.includes(phrase)) hits.push({ file, line: i + 1, phrase });
    }
  });
  return hits;
}

function main(): void {
  const files: string[] = [];
  for (const target of SCAN_TARGETS) walk(target, files);

  const hits = files.flatMap(scan);
  if (hits.length === 0) {
    console.log(`copy:check OK — scanned ${files.length} files, no forbidden safety copy.`);
    process.exit(0);
  }
  console.error(`copy:check FAILED — ${hits.length} forbidden phrase(s):`);
  for (const h of hits) {
    console.error(`  ${h.file}:${h.line}: "${h.phrase}"`);
  }
  process.exit(1);
}

main();
