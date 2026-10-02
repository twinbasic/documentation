Covered by the existing issue [twinbasic/twinbasic#841](https://github.com/twinbasic/twinbasic/issues/841).

## `import` stops with exit code 999 on any folder inside `Packages`, so a project that embeds a package cannot be packed

**Describe the bug**
`import`, the compiler executable's verb for packing a folder tree into a project file, stops partway through when the tree's top-level `Packages` folder contains a folder. It exits with code 999, writes no project file and leaves one already at the output path untouched. The last line printed is `IMPORTED FOLDER: <tree>\\Packages\`, with no `... DONE` and no `... FAILED`, and nothing reaches stderr. A package a project uses is embedded in it by default, as a folder of its own under `Packages`, so a project that embeds a package cannot be packed from its exported tree.

**To Reproduce**
Steps to reproduce the behavior:
1. Unzip `import-packages-folder.zip` (it holds `import-packages-folder.twinproj`) and run `twinBASIC_win32.exe export C:\path\import-packages-folder.twinproj C:\path\tree\`. The only unusual thing in the tree is the file `Packages\Nested\x.txt`, so `Packages` holds a folder.
2. Run `twinBASIC_win32.exe import C:\path\out.twinproj C:\path\tree\ --overwrite`.
3. See the output end at `IMPORTED FOLDER: C:\path\tree\\Packages\`, and the exit code be 999.
4. See that `out.twinproj` was not written, and that one already there is unchanged.

**Expected behavior**
The tree is packed, as it is when `Packages` holds no folder, and the run ends `... DONE` with exit code 0. If a folder in `Packages` is something the importer cannot accept, it should say so with an `ERROR:` line and `... FAILED`.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: the command line cannot pack any project that embeds a package, and the failure prints neither `... DONE` nor `... FAILED`. The exit code is 999, where every other failure observed exits 0. Also on BETA 983, and there with `twinBASIC_win64.exe` as well.

The smallest reproduction is one empty folder: export any project, add an empty `Packages\Nested\` to the tree, and import it. Every case below starts from a fresh `export` of the HelloWorld sample:

| added to the exported tree | result |
|---|---|
| nothing | exit 0, `... DONE` |
| an empty `Packages\Nested\` | **exit 999, no project** |
| `Packages\Nested\x.txt` | **exit 999, no project** |
| `Packages\Nested\Settings`, a copy of the root `Settings` | **exit 999, no project** |
| `Packages\A\B\` | **exit 999, no project** |
| `packages\Nested\`, in lower case | **exit 999, no project** |
| `Packages\x.txt` (a file, no folder) | exit 0, `... DONE` |
| an empty `Packages\` on its own | exit 0, `... DONE` |
| `Miscellaneous\Nested\x.txt` | exit 0, `... DONE` |
| `Sources\Packages\Nested\` (a `Packages` below the top level) | exit 0, `... DONE` |

So the trigger is a folder inside the top-level `Packages`, whatever it holds: an empty one does it, and so does one with a `Settings` file of its own, which is what a real package has. Leaving out `--overwrite` makes no difference: with a project already at the output path, `import` still stops with 999 rather than refusing to overwrite it.

This is not malformed input. `export` writes the embedded package out as a folder under `Packages`, and `import` of that tree then stops. Five of the 48 project and package files the IDE ships have such a folder: `WinNativeCommonCtls` (which embeds `VBComDlg`), samples 8, 17 and 23, and the *Standard EXE (plus VBCCR v1.8)* project template. Each was measured: `export` succeeds, and `import` of the tree it has just written stops as above. None of them round-trips through the command line, and neither does any project created from that template, nor any export written by the IDE's **Export Project**, which always adds the compiler packages under `Packages`.

<!-- Automated: bugs/import-packages-folder/repro.json is a cli reproducer (import of a copy of src/, expecting exit 999 and the Packages line). The folder in src is a file, Packages/Nested/x.txt, because git cannot hold an empty folder. The tooling side is scripts/impexp.mjs, which packs all five exported trees with every file byte-identical to the original; the only files missing are .meta files, the embedded packages' own included, which export does not write. Measured on BETA 983 and 995 with the rows above (cli995/bae.mjs and log1-*.txt) and by bug_repro verify on 995. Found by checking impexp.mjs against the compiler's import for line-ending handling: a probe tree with a made-up Packages\Nested\ never produced a project to compare. When fixed, the Export Project entry's remark that its output cannot be packed (the compiler packages under Packages) needs the same update. -->
