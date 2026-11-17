// The Visual C++ compiler, found on this machine: the newest Visual Studio with the C++ tools (by
// vswhere). Only `wdk`, which writes the WDK database, needs it; a user of the verifier never runs
// that. Every program built with it is a user-mode console program that includes the kernel
// headers for their types and only prints.
import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";

const pf86 = process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)";

/** The Windows Kits 10 folder. */
export const KITS = path.join(pf86, "Windows Kits", "10");

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

/**
 * Runs a command line in the compiler's environment for x64 or x86, from `dir`; returns
 * `{ok, output}`. The environment is set up by a one-off .cmd in `dir`, since it does not outlive
 * one cmd.exe.
 */
export function inMsvc(arch, dir, commandLine) {
  const script = path.join(dir, `run-${arch}.cmd`);
  writeFileSync(script, `@echo off\r\ncall "${vcvarsall()}" ${arch} >nul 2>&1\r\ncd /d "${dir}"\r\n${commandLine}\r\n`);
  try {
    const output = execFileSync("cmd.exe", ["/d", "/c", script], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 1 << 30,
    });
    return { ok: true, output };
  } catch (e) {
    return { ok: false, output: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}
