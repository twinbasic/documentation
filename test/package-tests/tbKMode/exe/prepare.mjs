// What tbKMode's exe cases need before they run, for one architecture: the user-mode stand-in for
// ntoskrnl.exe (fake-kernel/), built with Visual Studio's C compiler into %TEMP%, and named to the
// exe in TBKMODE_FAKE_KERNEL. The cases load it by that full path before they call any helper, so
// the package's `Lib "ntoskrnl.exe"` Declares resolve to it and never to the real kernel.
//
// package_tests.mjs imports this module and awaits its default export with the architecture
// (win32 or win64); the object it returns is added to the exe's environment.
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
  return { TBKMODE_FAKE_KERNEL: dll };
}
