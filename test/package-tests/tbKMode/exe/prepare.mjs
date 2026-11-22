// What tbKMode's exe cases need before they run, for one architecture: the user-mode stand-in for
// ntoskrnl.exe (fake-kernel/), and in a 32-bit build one for hal.dll, which passes each call to the
// first, built with Visual Studio's C compiler into %TEMP%. From 0.3.0.6 the package binds its
// Declares in the exe's import table (its Settings turn run-time binding off), so the loader
// resolves `ntoskrnl.exe` and `hal.dll` before any case runs, and looks in the exe's folder before
// System32: tbrun copies both there (`beside`), and the package's Declares resolve to them and never
// to the real kernel. TBKMODE_FAKE_KERNEL still names the first, which a case loads by that path
// when nothing named ntoskrnl.exe is loaded yet (a package that binds at run time).
//
// package_tests.mjs imports this module and awaits its default export with the architecture
// (win32 or win64): `env` is added to the exe's environment, and `beside` given to tbrun --beside.
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inMsvc } from "../verifier/lib/msvc.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

export default async function prepare(arch) {
  const msvcArch = arch === "win64" ? "x64" : "x86";
  const src = path.join(here, "fake-kernel");
  const out = path.join(tmpdir(), "tbkmode-fake-kernel", msvcArch);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const dll = path.join(out, "ntoskrnl.exe");
  const { output } = inMsvc(
    msvcArch,
    out,
    `cl /nologo /W3 /O2 /MT /LD "${path.join(src, "ntoskrnl.c")}" /Fo:"${path.join(out, "ntoskrnl.obj")}" /link /NOLOGO /DLL /DEF:"${path.join(src, "ntoskrnl.def")}" /OUT:"${dll}"`,
  );
  if (!existsSync(dll)) throw new Error(`the fake ntoskrnl.exe did not build (${msvcArch}):\n${output}`);
  const beside = [dll];
  if (arch === "win32") {
    // The 32-bit kernel's fast mutexes are hal.dll's, and the package's Declares name it there.
    const hal = path.join(out, "hal.dll");
    const built = inMsvc(
      msvcArch,
      out,
      `cl /nologo /W3 /O2 /MT /LD "${path.join(src, "hal.c")}" /Fo:"${path.join(out, "hal.obj")}" /link /NOLOGO /DLL /DEF:"${path.join(src, "hal.def")}" /OUT:"${hal}"`,
    );
    if (!existsSync(hal)) throw new Error(`the fake hal.dll did not build (${msvcArch}):\n${built.output}`);
    beside.push(hal);
  }
  return { env: { TBKMODE_FAKE_KERNEL: dll }, beside };
}
