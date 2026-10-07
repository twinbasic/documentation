Filed as [twinbasic/twinbasic#2494](https://github.com/twinbasic/twinbasic/issues/2494).

## A `[RunAfterBuild]` Sub does not run, and nothing says so, when a module is named like the project

**Describe the bug**
When a module has the same name as the project, a `[RunAfterBuild]` Sub does not run, and nothing says so. The build succeeds and the exe is written. The DEBUG CONSOLE's last line is `[BUILD] Executing '<project>.<module>.<Sub>'...`, and nothing follows it: no message box, no entry in the error panel, no diagnostic, and the status bar is as it is after a run that works. The names are compared without regard to letter case, so `ProbeWS` and `probews` clash as well. Even an empty module with the project's name, beside the module that holds the Sub, stops it. Observed in the DEBUG CONSOLE after pressing Build.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `module-named-like-project.twinproj` (attached as `module-named-like-project.zip`). The project is named `ModuleNamedLikeProject` and has one module of that name:
   ```
   Module ModuleNamedLikeProject
       Public Sub Main()
       End Sub
       [RunAfterBuild]
       Public Sub Hello()
           Debug.Cls
           Debug.Print "RunAfterBuild ran"
       End Sub
   End Module
   ```
2. Build the project.
3. Read the DEBUG CONSOLE. It ends at `[BUILD] Executing 'ModuleNamedLikeProject.ModuleNamedLikeProject.Hello'...`. `RunAfterBuild ran` is never printed.
4. Rename the module, to `Runner` for example, and build again. The console is cleared and holds `RunAfterBuild ran`.

**Expected behavior**
The Sub runs whatever the modules are called, as it does once the module is renamed. If a module may not have the project's name, the compiler should refuse it with an error, as VB6 does, and not build the project and skip the Sub in silence.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 997

**Additional context**
Also on BETA 995, identically.

VB6 refuses a project whose module has the project's name. Its build stops with `Name conflicts with existing module, project, or object library`, for a module that holds `Sub Main` (the project is attached as `module-named-like-project-vb6.zip`) and for an empty module of that name beside the module that holds `Sub Main` (checked, not attached). So VB6 reports the clash, where twinBASIC accepts it and skips the Sub.

What does not reproduce it: with any other module name, such as `Runner`, the Sub runs. A project with no module of the project's name runs it, whichever module holds it.

What reproduces it besides the plain case: the clash in another letter case, such as a project `ProbeWS` with a module `probews`; and an empty module with the project's name in a project whose `[RunAfterBuild]` Sub is in a different module, `Runner`, where the console ends at `[BUILD] Executing 'ProbeWS.Runner.<Sub>'...`, which names an unambiguous Sub. So the cause is the module's name, not a call that cannot be told apart.

Severity: moderate. A `[RunAfterBuild]` Sub runs after the exe is built, for example to sign it, and here it is skipped while the build reports success. Nothing points at the module's name as the cause, so the project's owner has to find it by renaming modules.

<!-- Reproducer: bugs/module-named-like-project/ (mode run, exe true; expects exit 5, the console's `[BUILD] Executing 'ModuleNamedLikeProject.ModuleNamedLikeProject.<Sub>'...` line, and no `RunAfterBuild ran`); verified on BETA 995 and 997 by `bug_repro.mjs verify`, with a copy whose module is named Runner as the control (exit 0, `RunAfterBuild ran`, verify says NO LONGER REPRODUCES). `bug_repro.mjs run` needs --exe by hand, because a project may hold one [RunAfterBuild] (TB5114) and this one's own is the subject; verify takes exe from repro.json. The harness wraps the Sub, so run's console names `tbrun_RunProbe`; a build in the IDE names the Sub itself. Steps 3 and 4 were checked on BETA 995 and 997 by building the reproducer, and a copy with the module named Runner, with `tbbuild --build --keep` and reading the DEBUG CONSOLE. The other-case and empty-module variants were checked on BETA 995 and 997 in scratch trees that are not in the reproducer. VB6: `bug_repro.mjs vb6 module-named-like-project` prints the refusal; the empty-module form was built in a scratch copy. docs/Reference/Attributes.md (#runafterbuild) carries a WARNING callout for this; once a fixed build is released, its sentences about the module's name go. WIP.ExamplesBuild.md (the bullet "No generated module may be named like the project") and scripts/check_examples.mjs (the comment on its three collision rules) state the rule for generated modules; they called the clash an ambiguous call that the IDE refuses at execution time, and were corrected with this entry. When fixed: say in both since which build the rule is no longer needed, or remove it. -->
