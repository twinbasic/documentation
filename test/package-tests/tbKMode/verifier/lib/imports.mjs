// Whether a built driver can load: every routine it imports must be exported by the kernel-mode file
// it names, in each build of that file the kernel database records for the driver's arch, and it may
// import from no other file, since the kernel loads no user-mode DLL for a driver.
import { buildLabel } from "./kernels.mjs";
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
    const ids = kernel.builds.map((b, i) => (b.arch === h.machine ? i : -1)).filter((i) => i >= 0);
    if (!ids.length) {
      unchecked.push(`${dll}: the database has no ${h.machine} build of it`);
      continue;
    }
    for (const name of names) {
      const have = new Set(kernel.exports[name] ?? []);
      const missing = ids.filter((i) => !have.has(i)).map((i) => buildLabel(kernel.builds[i]));
      if (missing.length === ids.length) {
        // Another kernel-mode file may export it for this arch: on x86, hal.dll exports KfRaiseIrql.
        const others = Object.entries(db.files)
          .filter(
            ([f, k]) => f !== dll.toLowerCase() && (k.exports[name] ?? []).some((i) => k.builds[i].arch === h.machine),
          )
          .map(([f]) => f);
        problems.push(`${dll} exports no ${name}${others.length ? `; ${others.join(" and ")} does` : ""}`);
      } else if (missing.length) problems.push(`${dll} of ${missing.join(", ")} exports no ${name}`);
    }
    if (h.machine === "x64" && kernel.absent.length)
      unchecked.push(`${dll}: the database has no build of ${kernel.absent.join(", ")}`);
  }
  return { machine: h.machine, imports, problems, unchecked, pass: problems.length === 0 };
}
