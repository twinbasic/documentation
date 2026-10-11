import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';

const execFileP = promisify(execFile);

async function git(cwd, ...args) {
  const { stdout } = await execFileP('git', args, { cwd });
  return stdout.trim();
}

async function ensureStore(storePath, snapshotsPath) {
  let needsInit = false;
  try {
    await fs.access(path.join(storePath, '.git'));
  } catch {
    needsInit = true;
  }

  if (!needsInit) return;

  await fs.mkdir(storePath, { recursive: true });
  await git(storePath, 'init');
  await git(storePath, 'config', 'user.name', 'indexer');
  await git(storePath, 'config', 'user.email', 'indexer@local');

  let seeded = false;
  try {
    const groups = await fs.readdir(snapshotsPath);
    for (const group of groups) {
      const groupDir = path.join(snapshotsPath, group);
      const stat = await fs.stat(groupDir);
      if (!stat.isDirectory()) continue;
      const packages = await fs.readdir(groupDir);
      for (const pkg of packages) {
        const apiSrc = path.join(groupDir, pkg, 'api.json');
        try {
          await fs.access(apiSrc);
          const dest = path.join(storePath, group, pkg, 'api.json');
          await fs.mkdir(path.dirname(dest), { recursive: true });
          await fs.copyFile(apiSrc, dest);
          seeded = true;
        } catch { /* no api.json for this package */ }
      }
    }
  } catch { /* no snapshots directory yet */ }

  if (seeded) {
    await git(storePath, 'add', '-A');
    await git(storePath, 'commit', '-m', 'baseline: seeded from docs repo snapshots');
  }
}

async function commitStore(storePath, message) {
  await git(storePath, 'add', '-A');
  const status = await git(storePath, 'status', '--porcelain');
  if (!status) return false;
  await git(storePath, 'commit', '-m', message);
  return true;
}

async function copyToSnapshots(storePath, snapshotsPath, groups) {
  for (const { group, package: pkg } of groups) {
    const src = path.join(storePath, group, pkg, 'api.json');
    const dest = path.join(snapshotsPath, group, pkg, 'api.json');
    try {
      await fs.access(src);
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.copyFile(src, dest);
    } catch { /* api.json not present in store */ }
  }
}

export { ensureStore, commitStore, copyToSnapshots };
