// The Visual C++ compiler and the WDK's headers, found on this machine: the newest Visual Studio
// with the C++ tools (by vswhere), and the newest kit under Windows Kits\10\Include that has a km
// folder. Every program built here is a user-mode console program that includes the kernel headers
// for their types and only prints.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const pf86 = process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)";

/** A folder under %TEMP% for this tool's work. */
export function workDir(...parts) {
  const dir = path.join(os.tmpdir(), "tbkmode-wdk", ...parts);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** vcvarsall.bat of the newest Visual Studio with the C++ tools. */
export function vcvarsall() {
  const vswhere = path.join(pf86, "Microsoft Visual Studio", "Installer", "vswhere.exe");
  if (!existsSync(vswhere)) throw new Error(`no vswhere at ${vswhere}: is Visual Studio installed?`);
  const root = execFileSync(
    vswhere,
    [
      "-latest",
      "-products",
      "*",
      "-requires",
      "Microsoft.VisualStudio.Component.VC.Tools.x86.x64",
      "-property",
      "installationPath",
    ],
    { encoding: "utf8" },
  ).trim();
  const bat = path.join(root, "VC", "Auxiliary", "Build", "vcvarsall.bat");
  if (!root || !existsSync(bat)) throw new Error("no Visual Studio with the C++ tools found");
  return bat;
}

/** The newest WDK include folder: <kits>\Include\<version>, which has km, shared and ucrt. */
export function wdkInclude() {
  const inc = path.join(pf86, "Windows Kits", "10", "Include");
  const versions = (existsSync(inc) ? readdirSync(inc) : [])
    .filter((v) => existsSync(path.join(inc, v, "km", "wdm.h")))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  if (!versions.length) throw new Error(`no WDK under ${inc} (no Include\\<version>\\km\\wdm.h)`);
  return path.join(inc, versions.at(-1));
}

/** Runs a command line in the compiler's environment for x64 or x86, from dir; returns its output. */
export function inMsvc(arch, dir, commandLine) {
  const script = path.join(dir, `run-${arch}.cmd`);
  writeFileSync(script, `@echo off\r\ncall "${vcvarsall()}" ${arch} >nul 2>&1\r\ncd /d "${dir}"\r\n${commandLine}\r\n`);
  try {
    return execFileSync("cmd.exe", ["/d", "/c", script], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    return `${e.stdout ?? ""}${e.stderr ?? ""}`;
  }
}

/**
 * Compiles one C or C++ file against the WDK's headers into an exe; returns the compiler's output.
 * With no ntddi the headers take the kit's newest Windows (WDK_NTDDI_VERSION in sdkddkver.h), so
 * that what they declare only for a later version of Windows 10 or 11 is declared too.
 */
export function compile(arch, dir, source, exe, { ntddi } = {}) {
  const inc = wdkInclude();
  const archDefs = arch === "x64" ? "/D_AMD64_ /D_WIN64" : "/D_X86_";
  const incs = ["km", "shared", "ucrt"].map((s) => `/I"${path.join(inc, s)}"`).join(" ");
  return inMsvc(
    arch,
    dir,
    `cl /nologo /W0 /EHsc ${archDefs} ${ntddi ? `/DNTDDI_VERSION=${ntddi} ` : ""}/D_WIN32_WINNT=0x0A00 ${incs} "${source}" /Fe:"${exe}" /Fo:"${exe.replace(/\.exe$/, ".obj")}"`,
  );
}
