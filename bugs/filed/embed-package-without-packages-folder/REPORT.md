Filed as [twinbasic/twinbasic#2442](https://github.com/twinbasic/twinbasic/issues/2442).

## Embedding a package with no `Packages` folder puts the compiler in a crash loop

**Describe the bug**
A `.twinpack` whose tree has no `Packages` folder, imported through Settings → References → Available Packages → **Import from file...**, ticked and applied, makes the compiler crash on each restart: `restarting from FILE` four times about two seconds apart, and then the IDE reports "Compiler crash loop detected. Restarting in SAFE mode."

**To Reproduce**
The package is invalid input, and it crashes the compiler four times: use an IDE you can restart.

Steps to reproduce the behavior:
1. Open `embed-package-without-packages-folder.twinproj` (attached as `embed-package-without-packages-folder.zip`). The package is in the second attachment, `DocProbePkg-nopackages.zip`: `DocProbePkg-nopackages.twinpack`, a package of one function, packed by `twinBASIC_win32.exe import` from a tree with a `Settings` file and `Sources\DocProbe.twin` and no other folder (the tree is `package\DocProbePkg` in the reproducer). The `import` verb writes `<name>.twinproj`; the file was renamed to `.twinpack`. The tree may lack `ImportedTypeLibraries` and `Miscellaneous` as well; neither matters.
2. In the project, Settings → References → Available Packages → **Import from file...** `DocProbePkg-nopackages.twinpack`, tick it, and **Apply**.
3. The Debug Console shows `[PROJECT] twinBASIC project saving to disk [DONE]`, then `restarting from FILE` four times about two seconds apart, and the IDE reports "Compiler crash loop detected. Restarting in SAFE mode."

**Expected behavior**
The compiler embeds the package, or refuses it with a diagnostic, and does not crash.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: low. The input is invalid, and nothing in a normal workflow makes it: every package the IDE writes has the folder, and `scripts/impexp.mjs` and `impexp.py` add it when a tree lacks it. A crash is still a poor answer to it.

An empty `Packages` folder in the package tree is enough to prevent it: the same steps with that folder alone, or with all three (`DocProbePkg-control.twinpack` in the same attachment, which `impexp.mjs` made), restart the compiler once and run the package.

What does not reproduce it: a project with the same package already embedded under `Packages\DocProbePkg`, without the folder, and opened cold compiles clean (also on BETA 983). So the loop needs the package to be embedded by the IDE. BETA 983 has not been tried through the IDE: in a lane its References page never finishes loading.

<!-- Measured on BETA 995 with the packages lane's host and package, with the package's three empty folders varied one at a time: only the missing `Packages` folder made the lane's embedding Apply end in the crash loop, and one run was watched with --show. That variant is no longer in the lane, because test/ide/packages.test.mjs now packs DocProbePkg with impexp.mjs, which adds the folders (its header comment says why), so no lane asserts this entry today; the reproducer's package (made with the tB executable, no folders at all) and the host project were not run through the IDE again. Retry by hand, or put the variant back into the lane, before filing. When fixed: update the header comment of test/ide/packages.test.mjs. The two package zips are not in git; make them from the .twinpack files. -->
