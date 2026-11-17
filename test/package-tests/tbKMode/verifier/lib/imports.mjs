// Whether a built driver can load: every routine it imports must be exported by the kernel-mode file
// it names, in each Windows version the kernel database records, and it may import from no other
// file, since the kernel loads no user-mode DLL for a driver.
import { importsOf, peHeaders } from "./pe.mjs";

/**
 * Judges a driver's import table against the kernel database (db/kernels.json).
 *
 * @param {Buffer} bytes  the driver file
 * @param {object} db     the kernel database
 * @returns {{machine: string, imports: {dll: string, names: string[]}[], problems: string[], unchecked: string[], pass: boolean}}
 */
export function checkDriver(bytes, db) {
  const h = peHeaders(bytes);
  const imports = importsOf(bytes);
  const problems = [];
  const unchecked = [];
  for (const { dll, names } of imports) {
    const kernel = db.files[dll.toLowerCase()];
    if (!kernel) {
      problems.push(`imports from ${dll}, which the kernel does not load for a driver: ${names.join(", ")}`);
      continue;
    }
    if (h.machine !== kernel.arch) {
      unchecked.push(`${dll}: the database has the ${kernel.arch} exports, the driver is ${h.machine}`);
      continue;
    }
    for (const name of names) {
      const have = new Set(kernel.exports[name] ?? []);
      const missing = kernel.builds.filter((_, i) => !have.has(i)).map((b) => b.windows);
      if (missing.length === kernel.builds.length) problems.push(`${dll} exports no ${name}`);
      else if (missing.length) problems.push(`${dll} of ${missing.join(", ")} exports no ${name}`);
    }
    if (kernel.absent.length) unchecked.push(`${dll}: the database has no build of ${kernel.absent.join(", ")}`);
  }
  return { machine: h.machine, imports, problems, unchecked, pass: problems.length === 0 };
}
