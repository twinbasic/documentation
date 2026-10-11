import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { compareWithManifest, fetchPackage, versionString } from './lib/sync.mjs';
import { compareBuiltinManifest, extractBuiltinPackages } from './lib/builtin-sync.mjs';
import { downloadRelease } from './lib/github-release.mjs';
import { preprocessVB6, CONTAINER_MAP } from './lib/vb6-preprocess.mjs';
import { lex } from './lib/lexer.mjs';
import { extract } from './lib/extractor.mjs';
import { emitApiJson } from './lib/json-emitter.mjs';
import { ensureStore, commitStore, copyToSnapshots } from './lib/store.mjs';
import { diffApi, auditCoverage } from './lib/differ.mjs';

const execFileP = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const STORE_PATH = path.join(__dirname, '.packages');
const SNAPSHOTS_PATH = path.join(__dirname, 'snapshots');
const MANIFESTS_DIR = path.join(__dirname, 'manifests');
const DOCS_REF_DIR = path.resolve(__dirname, '..', 'docs', 'Reference');
const REPO_ROOT = path.resolve(__dirname, '..');

const DEFAULT_PACKAGES = ['VBA', 'VBRUN', 'VB'];
const VB6_EXTS = new Set(Object.keys(CONTAINER_MAP));
const SOURCE_EXTS = new Set(['.twin', ...VB6_EXTS]);

// --- Helpers ---

function packageGroup(symbol, source) {
  if (source === 'contributed') return 'contributed';
  return DEFAULT_PACKAGES.includes(symbol) ? 'default' : 'built-in';
}

function groupDocsName(group) {
  if (group === 'default') return 'Default';
  if (group === 'built-in') return 'Built-In';
  return 'Contributed';
}

function countDecls(nodes) {
  let c = 0;
  for (const n of nodes) {
    c++;
    if (n.children) c += countDecls(n.children);
  }
  return c;
}

function indexFiles(files) {
  const fileResults = [];
  let declCount = 0;

  for (const { relativePath, content } of files) {
    const ext = path.extname(relativePath).toLowerCase();
    let processedContent = content;
    if (VB6_EXTS.has(ext)) {
      ({ content: processedContent } = preprocessVB6(content, ext));
    }
    const logicalLines = lex(processedContent);
    const { declarations, collectEnums, allEnums } = extract(logicalLines);
    collectEnums(declarations, relativePath);
    declCount += countDecls(declarations);
    fileResults.push({ relativePath, declarations, enums: allEnums });
  }

  return { fileResults, declCount };
}

function prepareSourceFiles(files) {
  return files
    .filter(f => SOURCE_EXTS.has(path.extname(f.relativePath).toLowerCase()))
    .map(f => {
      const rel = f.relativePath.startsWith('Sources/')
        ? f.relativePath.slice('Sources/'.length)
        : f.relativePath;
      return { relativePath: rel, content: f.content.toString('utf-8') };
    });
}

async function writeToStore(group, symbol, rawFiles, apiJsonStr) {
  const pkgDir = path.join(STORE_PATH, group, symbol);
  const sourcesDir = path.join(pkgDir, 'sources');
  await fs.rm(sourcesDir, { recursive: true, force: true });
  for (const f of rawFiles) {
    const ext = path.extname(f.relativePath).toLowerCase();
    if (!SOURCE_EXTS.has(ext)) continue;
    let rel = f.relativePath;
    if (rel.startsWith('Sources/')) rel = rel.slice('Sources/'.length);
    const dest = path.join(sourcesDir, rel);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, f.content);
  }
  await fs.writeFile(path.join(pkgDir, 'api.json'), apiJsonStr, 'utf-8');
}

async function buildPackageNameMap() {
  const map = new Map();
  for (const group of ['Default', 'Built-In', 'Contributed']) {
    const groupDir = path.join(DOCS_REF_DIR, group);
    try {
      const entries = await fs.readdir(groupDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const indexPath = path.join(groupDir, entry.name, 'index.md');
        try {
          const content = await fs.readFile(indexPath, 'utf-8');
          const m = content.match(/^package_name:\s*(.+)$/m);
          if (m) {
            for (const n of m[1].split(',')) {
              map.set(n.trim(), path.join(groupDir, entry.name));
            }
          }
        } catch { /* no index.md */ }
      }
    } catch { /* group dir doesn't exist */ }
  }
  return map;
}

async function findPackageDocsDir(name, group, packageNameMap) {
  const docsGroup = groupDocsName(group);
  const newPath = path.join(DOCS_REF_DIR, docsGroup, name);
  try { await fs.access(newPath); return newPath; } catch {}
  if (packageNameMap && packageNameMap.has(name)) {
    return packageNameMap.get(name);
  }
  const oldPath = path.join(DOCS_REF_DIR, name);
  try { await fs.access(oldPath); return oldPath; } catch {}
  return null;
}

async function readIndexedFrom(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const m = content.match(/^indexed_from:\s*(.+)$/m);
    return m ? m[1].trim() : null;
  } catch {
    return null;
  }
}

function parseYamlList(content, field) {
  const re = new RegExp(`^${field}:\\s*\\n((?:[ \\t]+- .+\\n?)*)`, 'm');
  const m = content.match(re);
  if (!m) return [];
  return m[1]
    .split('\n')
    .map(line => line.replace(/^\s+-\s*/, '').trim())
    .filter(Boolean);
}

async function readExclusions(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return {
      containers: new Set(parseYamlList(content, 'exclude_from_docs')),
      kinds: new Set(parseYamlList(content, 'exclude_kinds')),
    };
  } catch {
    return { containers: new Set(), kinds: new Set() };
  }
}

function isExcluded(sym, exclusions) {
  if (!exclusions) return false;
  // Exclude if the symbol's kind matches
  if (exclusions.kinds.has(sym.kind)) return true;
  // Exclude if the symbol IS an excluded container
  if (!sym.container && exclusions.containers.has(sym.name)) return true;
  // Exclude if the symbol belongs to an excluded container
  if (sym.container && exclusions.containers.has(sym.container)) return true;
  return false;
}

async function scanDocPages(docsDir) {
  const pages = new Map();
  if (!docsDir) return pages;
  try {
    const files = await walkDir(docsDir);
    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      const content = await fs.readFile(file, 'utf-8');
      const m = content.match(/^title:\s*(.+)$/m);
      if (m) pages.set(m[1].trim(), file);
    }
  } catch { /* directory doesn't exist */ }
  return pages;
}

async function walkDir(dir) {
  const results = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...await walkDir(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

// --- CLI ---

const cliArgs = process.argv.slice(2);
const command = cliArgs[0];

let packageFilter = null;
for (let i = 1; i < cliArgs.length; i++) {
  if (cliArgs[i] === '--package' && cliArgs[i + 1]) {
    packageFilter = [cliArgs[++i]];
  } else if (cliArgs[i] === '--packages' && cliArgs[i + 1]) {
    packageFilter = cliArgs[++i].split(',').map(s => s.trim());
  } else if (cliArgs[i] === '--help' || cliArgs[i] === '-h') {
    showHelp();
    process.exit(0);
  }
}

function showHelp() {
  console.log('Usage: node indexer/twin-index.mjs <command> [options]');
  console.log('');
  console.log('Commands:');
  console.log('  sync      Download packages, extract sources, generate api.json snapshots');
  console.log('  analyze   Diff API snapshots against documented baseline');
  console.log('');
  console.log('Options:');
  console.log('  --package <name>       Process only the specified package');
  console.log('  --packages <a>,<b>     Process only the specified packages');
}

switch (command) {
  case 'sync':
    await runSync(packageFilter);
    break;
  case 'analyze':
    await runAnalyze(packageFilter);
    break;
  case '--help':
  case '-h':
  case undefined:
    showHelp();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    showHelp();
    process.exit(1);
}

// --- sync command ---

async function runSync(filter) {
  await fs.mkdir(MANIFESTS_DIR, { recursive: true });
  await ensureStore(STORE_PATH, SNAPSHOTS_PATH);

  const synced = [];
  const failed = [];

  // --- Contributed packages (TWINSERV) ---
  const contribManifestPath = path.join(MANIFESTS_DIR, 'contributed.json');
  console.log('Fetching TWINSERV package index...');
  const { toDownload, unchanged, removed, manifest: contribManifest } =
    await compareWithManifest(contribManifestPath);

  let contribToDownload = filter
    ? toDownload.filter(p => filter.includes(p.symbol))
    : toDownload;

  // Re-download unchanged packages whose store directories are missing (fresh clone)
  const missingContrib = [];
  for (const item of unchanged) {
    if (filter && !filter.includes(item.symbol)) continue;
    try {
      await fs.access(path.join(STORE_PATH, 'contributed', item.symbol, 'sources'));
    } catch {
      contribToDownload.push({ ...item, reason: 'missing-sources' });
      missingContrib.push(item.symbol);
    }
  }
  if (missingContrib.length) console.log(`  Missing sources: ${missingContrib.join(', ')}`);

  const addedC = contribToDownload.filter(p => p.reason === 'added');
  const updatedC = contribToDownload.filter(p => p.reason === 'updated');
  if (addedC.length) console.log(`  Add: ${addedC.map(p => p.symbol).join(', ')}`);
  if (updatedC.length) console.log(`  Update: ${updatedC.map(p => p.symbol).join(', ')}`);
  if (!filter && removed.length) console.log(`  Remove: ${removed.map(p => p.symbol).join(', ')}`);
  if (!contribToDownload.length && !removed.length) console.log('  Up to date.');

  for (const item of contribToDownload) {
    try {
      console.log(`  Fetching ${item.symbol}...`);
      const files = await fetchPackage(item.id, item.version);
      const sourceFiles = prepareSourceFiles(files);
      const { fileResults, declCount } = indexFiles(sourceFiles);
      const ver = versionString(item.version);
      const apiJson = emitApiJson(item.symbol, ver, fileResults);

      await writeToStore('contributed', item.symbol, files, apiJson);

      contribManifest.packages[item.id] = {
        symbol: item.symbol,
        publisher: item.pkg.publisher,
        version: ver,
        publishedDate: item.version.publishedDate,
        publishedTime: item.version.publishedTime,
      };

      synced.push({ group: 'contributed', package: item.symbol, from: null, to: ver });
      console.log(`    ${sourceFiles.length} files, ${declCount} declarations`);
    } catch (e) {
      failed.push({ symbol: item.symbol, error: e.message });
      console.warn(`    FAILED: ${item.symbol}: ${e.message}`);
    }
  }

  if (!filter) {
    for (const { id, symbol } of removed) {
      delete contribManifest.packages[id];
    }
  }

  contribManifest.syncedAt = new Date().toISOString();
  await fs.writeFile(contribManifestPath, JSON.stringify(contribManifest, null, 2) + '\n');

  // --- Built-in + Default packages (GitHub release) ---
  const builtinManifestPath = path.join(MANIFESTS_DIR, 'built-in.json');
  console.log('\nChecking twinBASIC release...');
  const release = await compareBuiltinManifest(builtinManifestPath);
  console.log(`  Tag: ${release.tag}`);

  // Force re-download if any built-in/default packages are missing from the store
  if (!release.needsUpdate) {
    const symbols = Object.values(release.manifest.packages || {}).map(p => p.symbol);
    for (const sym of symbols) {
      if (filter && !filter.includes(sym)) continue;
      const group = packageGroup(sym, 'builtin');
      try {
        await fs.access(path.join(STORE_PATH, group, sym, 'sources'));
      } catch {
        console.log(`  Missing sources: ${sym}`);
        release.needsUpdate = true;
        break;
      }
    }
  }

  if (release.needsUpdate) {
    console.log('  Downloading release...');
    const zipBuffer = await downloadRelease(release.assetUrl);
    const builtinPackages = extractBuiltinPackages(zipBuffer);
    console.log(`  Extracted ${builtinPackages.length} packages`);

    const toProcess = filter
      ? builtinPackages.filter(p => filter.includes(p.symbol))
      : builtinPackages;

    const builtinManifest = {
      syncedAt: new Date().toISOString(),
      twinbasicTag: release.tag,
      publishedAt: release.publishedAt,
      packages: {},
    };

    if (filter && release.manifest.packages) {
      Object.assign(builtinManifest.packages, release.manifest.packages);
    }

    for (const pkg of toProcess) {
      const sourceFiles = prepareSourceFiles(pkg.files);
      const { fileResults, declCount } = indexFiles(sourceFiles);
      const group = packageGroup(pkg.symbol, 'builtin');
      const apiJson = emitApiJson(pkg.symbol, release.tag, fileResults);

      await writeToStore(group, pkg.symbol, pkg.files, apiJson);

      builtinManifest.packages[pkg.guid] = { symbol: pkg.symbol };
      synced.push({ group, package: pkg.symbol, from: release.manifest.twinbasicTag, to: release.tag });
      console.log(`    ${pkg.symbol}: ${sourceFiles.length} files, ${declCount} declarations`);
    }

    for (const pkg of builtinPackages) {
      if (!builtinManifest.packages[pkg.guid]) {
        builtinManifest.packages[pkg.guid] = { symbol: pkg.symbol };
      }
    }

    await fs.writeFile(builtinManifestPath, JSON.stringify(builtinManifest, null, 2) + '\n');
  } else {
    console.log(`  Up to date (${release.tag}).`);
  }

  // --- Commit store and copy snapshots ---
  if (synced.length) {
    const parts = synced.map(s => {
      if (s.from && s.from !== s.to) return `${s.package} ${s.from}→${s.to}`;
      return `${s.package} ${s.to}`;
    });
    const committed = await commitStore(STORE_PATH, `sync: ${parts.join(', ')}`);
    if (committed) {
      await copyToSnapshots(STORE_PATH, SNAPSHOTS_PATH, synced);
      console.log('\nSnapshots updated.');
    }
  }

  console.log(
    `\nDone. ${synced.length} synced` +
    (failed.length ? `, ${failed.length} failed` : '') + '.',
  );
}

// --- analyze command ---

async function runAnalyze(filter) {
  const packageNameMap = await buildPackageNameMap();
  const groups = ['default', 'built-in', 'contributed'];
  const packageList = [];

  for (const group of groups) {
    const groupDir = path.join(STORE_PATH, group);
    try {
      const pkgs = await fs.readdir(groupDir);
      for (const pkg of pkgs) {
        if (filter && !filter.includes(pkg)) continue;
        const stat = await fs.stat(path.join(groupDir, pkg));
        if (!stat.isDirectory()) continue;
        const apiPath = path.join(groupDir, pkg, 'api.json');
        try {
          await fs.access(apiPath);
          packageList.push({ group, name: pkg, apiPath });
        } catch { /* no api.json for this package */ }
      }
    } catch { /* group directory doesn't exist */ }
  }

  if (!packageList.length) {
    console.log('No packages to analyze. Run sync first.');
    return;
  }

  const allReports = [];

  for (const { group, name, apiPath } of packageList) {
    console.log(`\nAnalyzing ${name} (${group})...`);
    const current = JSON.parse(await fs.readFile(apiPath, 'utf-8'));

    const docsDir = await findPackageDocsDir(name, group, packageNameMap);
    const indexMdPath = docsDir ? path.join(docsDir, 'index.md') : null;
    const indexedFrom = indexMdPath ? await readIndexedFrom(indexMdPath) : null;
    const exclusions = indexMdPath ? await readExclusions(indexMdPath) : null;

    let report;
    if (indexedFrom) {
      report = await analyzeUpdate(name, group, current, indexedFrom, docsDir, exclusions);
    } else {
      report = await analyzeAudit(name, group, current, docsDir, exclusions);
    }

    allReports.push(report);
    printReport(report);
  }

  const reportPath = path.join(STORE_PATH, 'report.json');
  await fs.writeFile(reportPath, JSON.stringify(allReports, null, 2) + '\n');
  console.log(`\nReport written to ${reportPath}`);
}

async function analyzeUpdate(name, group, current, indexedFrom, docsDir, exclusions) {
  const snapshotRel = `indexer/snapshots/${group}/${name}/api.json`;
  let baseline = null;
  try {
    const { stdout } = await execFileP('git', ['show', `HEAD:${snapshotRel}`], { cwd: REPO_ROOT });
    baseline = JSON.parse(stdout);
  } catch { /* no committed snapshot */ }

  if (!baseline || baseline.version !== indexedFrom) {
    if (baseline && baseline.version !== indexedFrom) {
      console.log(`  Warning: indexed_from (${indexedFrom}) != snapshot version (${baseline.version})`);
    }
    return analyzeAudit(name, group, current, docsDir, exclusions);
  }

  const diff = diffApi(baseline, current);
  const docPages = await scanDocPages(docsDir);

  let excludedCount = 0;
  const notExcluded = s => {
    if (isExcluded(s, exclusions)) { excludedCount++; return false; }
    return true;
  };
  const notExcludedMod = m => {
    if (isExcluded(m.current, exclusions)) { excludedCount++; return false; }
    return true;
  };

  const publicAdded = diff.added.filter(s => s.access !== 'Private').filter(notExcluded);
  const publicModified = diff.modified.filter(m => m.current.access !== 'Private').filter(notExcludedMod);
  const publicRemoved = diff.removed.filter(s => s.access !== 'Private').filter(notExcluded);
  const publicUnchanged = diff.unchanged.filter(s => s.access !== 'Private').filter(notExcluded);

  const tasks = [];

  for (const sym of publicAdded) {
    tasks.push({
      action: 'create',
      module: sym.container || sym.name,
      symbol: sym.name,
      kind: sym.kind,
      signature: sym.signature,
      file: sym.file,
    });
  }

  for (const { current: cur, baseline: base } of publicModified) {
    tasks.push({
      action: 'update',
      module: cur.container || cur.name,
      symbol: cur.name,
      kind: cur.kind,
      reason: 'signature_changed',
      old_signature: base.signature,
      new_signature: cur.signature,
      file: cur.file,
      doc_page: docPages.get(cur.name) || null,
    });
  }

  for (const sym of publicRemoved) {
    tasks.push({
      action: 'flag_removal',
      module: sym.container || sym.name,
      symbol: sym.name,
      kind: sym.kind,
      doc_page: docPages.get(sym.name) || null,
    });
  }

  const totalPublic = publicAdded.length + publicModified.length +
    publicRemoved.length + publicUnchanged.length;

  return {
    package: name,
    group,
    mode: 'update',
    from: baseline.version,
    to: current.version,
    tasks,
    summary: {
      total_public: totalPublic,
      documented: totalPublic - publicAdded.length,
      to_create: publicAdded.length,
      to_update: publicModified.length,
      to_remove: 0,
      flagged: publicRemoved.length,
      excluded: excludedCount,
    },
  };
}

async function analyzeAudit(name, group, current, docsDir, exclusions) {
  const docPages = await scanDocPages(docsDir);
  const coverage = auditCoverage(current, docPages);

  let excludedCount = 0;
  const tasks = [];
  for (const sym of coverage.undocumented) {
    if (isExcluded(sym, exclusions)) { excludedCount++; continue; }
    tasks.push({
      action: 'create',
      module: sym.container || sym.name,
      symbol: sym.name,
      kind: sym.kind,
      signature: sym.signature || null,
      file: sym.file || null,
    });
  }

  // Also count excluded symbols from the documented list for accurate totals
  const documentedFiltered = coverage.documented.filter(s => {
    if (isExcluded(s, exclusions)) { excludedCount++; return false; }
    return true;
  });

  return {
    package: name,
    group,
    mode: 'audit',
    from: null,
    to: current.version,
    tasks,
    summary: {
      total_public: documentedFiltered.length + tasks.length,
      documented: documentedFiltered.length,
      to_create: tasks.length,
      to_update: 0,
      to_remove: 0,
      flagged: 0,
      excluded: excludedCount,
    },
  };
}

function printReport(report) {
  const s = report.summary;
  console.log(`  Mode: ${report.mode}`);
  if (report.from) console.log(`  From: ${report.from} → ${report.to}`);
  else console.log(`  Version: ${report.to}`);
  console.log(`  Public symbols: ${s.total_public} (${s.documented} documented)`);
  if (s.to_create) console.log(`  To create: ${s.to_create}`);
  if (s.to_update) console.log(`  To update: ${s.to_update}`);
  if (s.flagged) console.log(`  Flagged for removal: ${s.flagged}`);
  if (s.excluded) console.log(`  Excluded: ${s.excluded}`);
}
