Filed as [twinbasic/twinbasic#2505](https://github.com/twinbasic/twinbasic/issues/2505).

## Builds running at the same time in one TEMP folder sometimes fail to write the type library

**Describe the bug**
When several twinBASIC IDEs build at the same time, and their `TEMP` is the same folder, which is the default for one user, a build now and then fails while writing the type library, with nothing wrong in the project. The same build passes when repeated, or when it runs alone. With a different `TEMP` folder for each IDE, the failure did not occur.

**To Reproduce**
Steps to reproduce the behavior:
1. Unzip `concurrent-builds-shared-temp.zip` (it holds `concurrent-builds-shared-temp.twinproj`, an ordinary console project with an empty `Sub Main`) and copy the project into eight folders, one copy each.
2. Open each copy in its own instance of the IDE, all eight running at once, with the default environment, so that every instance has the same `TEMP`.
3. Press **Build** in all eight at about the same time, and repeat. About one build in 24 fails; the DEBUG CONSOLE of the one that failed shows:
   ```
   [BUILD] Starting...
   [TYPELIB] failed to finalize typelibrary.  Disk error?
   [LINKER] FAILED to create type library
   [BUILD] failed
   ```
4. Control: start each instance with `TEMP` and `TMP` set to a folder of its own (for example from a Command Prompt, `set TEMP=C:\t\1` and `set TMP=C:\t\1`, then start the IDE from it). The failure does not occur.

Measured with the documentation's build harness, which starts each IDE on its own port and presses Build through it, eight IDEs at once, over 192 builds each way: 8 failed with one `TEMP` for all eight, and 0 failed with a `TEMP` folder for each. With one or two IDEs at once, 0 of 120 failed. Distinct project names and project ids in each copy did not prevent it. The failing build is a different one each time.

**Expected behavior**
Each build writes its type library and succeeds, however many IDEs share the `TEMP` folder.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: low; the build passes when repeated, and an IDE run by a person rarely builds at the same moment as another. It affects tools that build several projects at once. The compiler imports `GetTempFileNameW`, and its messages show that it writes the type library to a file and reads it back (`[TYPELIB] failed to read in generated type library file` is the message beside this one). A temporary file name that two processes both use would explain the counts; that is an inference, not observed. The temp folder is empty after the builds, so whatever is written there is deleted.

<!-- Reproducer: bugs/concurrent-builds-shared-temp/ (mode probe: scripts/probe_shared_temp.mjs builds it in eight IDEs at once with one TEMP, and with --control a TEMP each; on BETA 997, 3 of 8 failed in the first round shared, 0 of 48 with a TEMP each; on BETA 1005, 1 of 32 shared, in round 4, with `[TYPELIB] failed to read in generated type library file` in place of `failed to finalize`. The probe finds the reproducer under bugs/ or bugs/filed/). The first measurement used the same console template with check_examples' two staging modules, not this reproducer itself: a Sonnet agent's 904 builds through tbbuild-style lanes, data in %TEMP%/claude/typelib-probe/results.jsonl (not kept), 2026-10-02, BETA 995 only; no 983 control. scripts/lib/tb-ide.mjs's launchIde gives every IDE %TEMP%/tbbuild-tmp-<port> since 7a716388, so no harness of this repository reproduces it today: to measure it again, pass TEMP and TMP to launchIde's env. When fixed, the comment in launchIde and WIP.ExamplesBuild.md's per-IDE temp folder note may say so; the folders can stay. -->
