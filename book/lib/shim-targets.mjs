// What a pdf-lib shim replaces, checked before it replaces it.
//
// Each shim was written against the source of pdf-lib 1.17.1, which
// package.json pins exact. The pin stops an accidental update; this stops a
// deliberate one, or an edit under node_modules, from changing the book
// silently. Before it patches anything, a shim passes checkTargets() a table
// of what it replaces: each member it overwrites, and the constructor of each
// class whose instances it builds without calling it, with the arity and
// source fingerprint each has in 1.17.1; and ABSENT for each member it adds,
// which 1.17.1 does not have. A member that differs makes the import throw,
// naming the shim and every member that differs, with the fingerprint it has
// now. Read the new source, then re-derive the shim and its table, or remove
// the shim.
//
// A fingerprint is the first 12 hex digits of the SHA-256 of the function's
// source text, as Function.prototype.toString returns it.
//
// Not a shim: it installs nothing, and imports nothing from pdf-lib.

import { createHash } from 'node:crypto';

export const ABSENT = Symbol('not in pdf-lib 1.17.1');

export function fingerprint(fn) {
  return createHash('sha256').update(Function.prototype.toString.call(fn)).digest('hex').slice(0, 12);
}

// shimUrl is the shim's import.meta.url. roots holds the pdf-lib objects the
// shim imports, by name; each key of targets is a path from one of them, such
// as 'PDFDict.prototype.get', and each value is [arity, fingerprint] or ABSENT.
export function checkTargets(shimUrl, roots, targets) {
  const faults = [];
  for (const [path, expected] of Object.entries(targets)) {
    const names = path.split('.');
    const key = names.pop();
    let holder = roots;
    for (const name of names) holder = holder?.[name];
    if (Object(holder) !== holder) {
      faults.push(`${path}: ${names.join('.')} is missing`);
    } else if (expected === ABSENT) {
      if (key in holder) faults.push(`${path}: pdf-lib has it now, and the shim adds it`);
    } else {
      const [arity, print] = expected;
      const value = holder[key];
      if (typeof value !== 'function') {
        faults.push(`${path}: ${value === undefined ? 'is missing' : `is a ${typeof value}, not a function`}`);
      } else if (value.length !== arity) {
        faults.push(`${path}: takes ${value.length} argument(s), not ${arity}`);
      } else if (fingerprint(value) !== print) {
        faults.push(`${path}: its source has changed (fingerprint ${fingerprint(value)}, not ${print})`);
      }
    }
  }
  if (faults.length === 0) return;
  const shim = new URL(shimUrl).pathname.split('/').pop();
  throw new Error(
    `${shim}: pdf-lib is not what this shim replaces:\n  ${faults.join('\n  ')}\n` +
      'Read the new source, then re-derive the shim and its table, or remove it (see book/lib/shim-targets.mjs).'
  );
}
