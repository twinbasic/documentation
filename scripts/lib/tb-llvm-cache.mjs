// The lease every tool holds on twinBASIC's LLVM cache server while it builds
// with LLVM. The one place the harness takes it; the lease itself is the
// vendored library in llvm-cache/ (its README states the contract).
//
// The cache server is a process, <install>\bin\twinBASIC_win64.exe --cache=1,
// that every compiler on the machine finds through one machine-wide pipe. A
// compiler that finds none starts one as its own child, in its IDE's job, so
// that server ends with that IDE, and every other run's compiler loses its
// cache, restarts and abandons its build. A tool that holds a lease before its
// IDE starts has a server started outside every IDE's job, which lives while
// any lease is held and ends about 15 s after the last one.
//
// A lease is taken after the arguments and the install have been checked and
// before an IDE starts, and released once that IDE has ended. A tool that
// starts many LLVM runs holds one for its whole run, so the server never ends
// between them. A run without LLVM takes none.

import path from "node:path";
import { acquireLlvmCache } from "./llvm-cache/llvm-cache.mjs";

/**
 * Whether a project asks for LLVM: `+llvm` in its compiler options (the run's or
 * the exe's), or a procedure's own `[CompilerOptions("... +llvm ...")]`.
 *
 * @param {Record<string, unknown>} settings  the project's Settings, as staged
 * @param {string} [sourceText]  the text of its .twin files
 */
export function asksForLlvm(settings, sourceText = "") {
  return (
    /\+llvm\b/i.test(`${settings["compiler.debugOptions"] ?? ""} ${settings["compiler.buildOptions"] ?? ""}`) ||
    /\[\s*CompilerOptions\s*\(\s*"[^"]*\+llvm/i.test(sourceText)
  );
}

/**
 * Takes a lease on the LLVM cache server of the install `ide` belongs to,
 * starting the server when none answers. A server of another install on the
 * same pipe is used: the pipe's name is the protocol (BETA 1007 and 1010 share
 * v6). The lease is also released when this process exits, however it exits.
 *
 * @param {string} ide  the twinBASIC.exe the tool found (findIde), never a searched one
 * @returns {Promise<{ pipe: string, serverPid: number, holderPid: number, started: boolean,
 *   release: () => Promise<void>, releaseSync: () => void }>}
 * @throws {Error}  saying why no lease could be taken: a harness failure, exit 2
 */
export async function holdLlvmCache(ide) {
  let lease;
  try {
    lease = await acquireLlvmCache({ install: path.dirname(path.resolve(ide)) });
  } catch (e) {
    throw new Error(`could not take a lease on the LLVM cache server: ${e.message}`);
  }
  const onExit = () => lease.releaseSync();
  process.on("exit", onExit);
  return {
    pipe: lease.pipe,
    serverPid: lease.serverPid,
    holderPid: lease.holderPid,
    started: lease.started,
    release: async () => {
      process.off("exit", onExit);
      await lease.release();
    },
    releaseSync: () => {
      process.off("exit", onExit);
      lease.releaseSync();
    },
  };
}

/** What a --json report says of a lease: null for a run that held none. */
export const leaseReport = (lease) =>
  lease ? { pipe: lease.pipe, serverPid: lease.serverPid, started: lease.started } : null;
