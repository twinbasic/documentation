// Re-launch the current Node process under `start /affinity HEX /high`
// on Windows for stable benchmark measurements. No-op on non-Windows.
//
// Stock Windows dev boxes have 15-25 % single-run variance on CPU
// sample-time because background processes share cores with the
// renderer being profiled. Pinning the benchmark to a fixed subset of
// logical processors (and raising priority class to High) brings that
// down to ~3 %. Child processes (puppeteer's Chromium + its renderer /
// utility children) inherit the mask + priority from us at spawn time.
//
// Default mask 0x5500 = LPs 8, 10, 12, 14 = physical cores 4..7, thread
// 0 of each pair only on an 8-core / 16-thread AMD Ryzen 7 (Zen 1..4).
// Avoids SMT contention; steers clear of cores 0-3 where Windows
// system threads cluster.
//
// Usage:
//   import { pinCpuIfWindows } from './pin-cpu.mjs';
//   pinCpuIfWindows({ toolName: 'measure.mjs' });   // call BEFORE any work
//
// Knobs (env / argv):
//   PERF_PINNED=1       sentinel set by the relaunched child so the
//                       shim doesn't recurse. Also: set this manually
//                       to suppress pinning entirely.
//   PERF_AFFINITY=HEX   override the default mask. Hex string, no 0x.
//   --no-affinity       CLI flag with the same effect as PERF_PINNED=1.

import { spawnSync } from 'node:child_process';

const DEFAULT_MASK = '5500';

/**
 * @param {Object} opts
 * @param {string} [opts.toolName] - logged in the relaunch banner.
 * @param {string} [opts.defaultMask] - hex string (no 0x), default '5500'.
 */
export function pinCpuIfWindows(opts = {}) {
  if (process.platform !== 'win32') return;
  if (process.env.PERF_PINNED) return;
  if (process.argv.includes('--no-affinity')) return;

  const toolName = opts.toolName || 'perf';
  const mask = process.env.PERF_AFFINITY || opts.defaultMask || DEFAULT_MASK;

  const argv0 = process.argv[1];
  const userArgs = process.argv.slice(2)
    .map(a => /[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a)
    .join(' ');

  console.error(`[${toolName}] Re-launching with /affinity 0x${mask} /high to stabilise measurements.`);
  console.error(`[${toolName}] Override mask: PERF_AFFINITY=<hex>. Skip pinning: --no-affinity.`);

  // Empty "" after start is a window-title placeholder. Without it,
  // start consumes the first quoted token as the title and corrupts
  // the script path. shell:true so cmd.exe handles the inner quoting
  // (Node's CRT would otherwise escape the inner quotes and break
  // start's argument parsing).
  const cmdLine = `set PERF_PINNED=1 && start "" /affinity ${mask} /high /wait /b node "${argv0}" ${userArgs}`;
  const r = spawnSync(cmdLine, { shell: true, stdio: 'inherit' });
  process.exit(r.status ?? 0);
}
