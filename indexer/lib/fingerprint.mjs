import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

/**
 * What an api.json depends on besides a package's sources: the code that reads
 * them and writes the file. A store records the fingerprint of these files beside
 * each api.json it writes, so that a change to any of them, which can change what
 * the same sources are indexed into, is found by comparing one string, and the
 * packages are indexed again from the sources the store already holds.
 *
 * The list is every module `api-model.mjs` imports, directly or not
 * (`test/indexer.test.mjs` checks that it still is), the paths relative to this
 * file. `package-files.mjs`, which turns a download into files, is not on it: its
 * output is what the store keeps, and the index is built from that.
 */
export const FINGERPRINTED = [
  "../../scripts/lib/twin-api.mjs",
  "../../scripts/lib/twin-declarations.mjs",
  "./api-model.mjs",
  "./vb6-preprocess.mjs",
];

/**
 * The fingerprint of `files`, `{ name, text }` each: a SHA-256 over their names
 * and their text with the line ends made `\n`, so that a checkout with CRLF line
 * ends and one with LF give the same string.
 */
export function fingerprintOf(files) {
  const hash = createHash("sha256");
  for (const { name, text } of files) {
    hash.update(`${name}\n${text.replace(/\r\n/g, "\n")}\n\u0000\n`);
  }
  return hash.digest("hex");
}

let current = null;

/** The fingerprint of the code this checkout indexes with (read once). */
export function indexerFingerprint() {
  current ??= fingerprintOf(
    FINGERPRINTED.map((name) => ({ name, text: readFileSync(new URL(name, import.meta.url), "utf-8") })),
  );
  return current;
}
