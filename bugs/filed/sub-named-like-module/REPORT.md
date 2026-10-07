Filed as [twinbasic/twinbasic#2481](https://github.com/twinbasic/twinbasic/issues/2481).

## A `[RunAfterBuild]` Sub does not run, and nothing says so, when its module holds a procedure named like the module

**Describe the bug**
When a module holds a procedure with the same name as the module, a `[RunAfterBuild]` Sub in that module does not run, and nothing says so. The build succeeds and the exe is written. The DEBUG CONSOLE's last line is `[BUILD] Executing '<project>.<module>.<Sub>'...`, and nothing follows it: no message box, no entry in the error panel, no diagnostic. Not even the first statement of the Sub runs. The names are compared without regard to letter case, so `Runner` and `runner` clash. A Sub, a Function and a `Private` Sub all cause it, and the procedure does not have to be called. Observed in the DEBUG CONSOLE after pressing Build.

This is a sibling of "A `[RunAfterBuild]` Sub does not run, and nothing says so, when a module is named like the project". There the module and the project share a name; here the project's name plays no part, and the clash is inside one module.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `sub-named-like-module.twinproj` (attached as `sub-named-like-module.zip`). The project is named `SubNamedLikeModule`. It has a `Startup` module with an empty `Sub Main`, and this module:
   ```
   Module Probe
       [RunAfterBuild]
       Public Sub Hello()
           Debug.Cls
           Debug.Print "RunAfterBuild ran"
       End Sub

       Public Sub Probe()
       End Sub
   End Module
   ```
2. Build the project.
3. Read the DEBUG CONSOLE. It ends at `[BUILD] Executing 'SubNamedLikeModule.Probe.Hello'...`. `RunAfterBuild ran` is never printed.
4. Rename `Sub Probe` to `NotProbe`, or move it to another module, and build again. The console is cleared and holds `RunAfterBuild ran`.

**Expected behavior**
The Sub runs whatever the other procedures in its module are called, as it does once `Probe` is renamed. If a procedure may not have its module's name, the compiler should refuse it with an error, and not build the project and skip the Sub in silence. Writing `Probe.Probe` in code is already refused, with TB5027.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 997

**Additional context**
Also on BETA 983, identically, so this is not a recent regression.

VB6 accepts the name. A project named `SubNamedLikeModule` with a standard module `Probe` (`Attribute VB_Name = "Probe"`) that holds `Public Sub Probe()` builds, and `Sub Main` calls `Probe` and it runs (the project is attached as `sub-named-like-module-vb6.zip`; it printed `Sub Probe ran, in a module named Probe`). VB6 has no `[RunAfterBuild]`, so what is checked is that the module and the Sub can coexist.

What does not reproduce it: a procedure with another name, such as `NotProbe`. A procedure named like a module, when the module that holds it is a different one from the module that holds the `[RunAfterBuild]` Sub (a `Runner` module holding the Sub, and an `Other` module holding `Sub Other`).

What reproduces it besides the plain case: a `Function Probe`, a `Private Sub Probe`, and the clash in another letter case (`Module Runner` with `Sub runner`). The failure needs no help from any tool: the Sub is the one marked `[RunAfterBuild]`, and its body never starts.

Severity: moderate. A `[RunAfterBuild]` Sub runs after the exe is built, for example to sign it, and here it is skipped while the build reports success. Nothing points at the clash as the cause, so the project's owner has to find it by renaming procedures.

<!-- Reproducer: bugs/sub-named-like-module/ (mode run, exe true; expects exit 5, the console's `[BUILD] Executing 'SubNamedLikeModule.Probe.<Sub>'...` line, and no `RunAfterBuild ran`); verified on BETA 997 by `bug_repro.mjs verify` (reproduces, run exit 5), with a scratch copy whose Sub is named NotProbe as the control (exit 0, `RunAfterBuild ran`, verify says NO LONGER REPRODUCES); the copy was removed from bugs/ afterwards. `bug_repro.mjs run` needs --exe by hand, because a project may hold one [RunAfterBuild] (TB5114) and this one's own is the subject; verify takes exe from repro.json. The harness wraps the Sub in a Sub of its own appended to the same module, so run's console names `tbrun_RunProbe`; a build in the IDE names the Sub itself. The wrapper is not needed: a tree whose attribute the wrapper does not match (`[Description("x")] [RunAfterBuild]` on one line) fails the same way, and a marker file written by the Sub's first statement is not written. The scratch trees for the Function, Private Sub, other-case, other-module and BETA 983 variants are not in the reproducer; the variants were checked on BETA 997, the plain case and its no-wrapper form on BETA 983 as well. VB6: `bug_repro.mjs vb6 sub-named-like-module` prints `Sub Probe ran, in a module named Probe` and `Sub Main ran`. Related entry: "A `[RunAfterBuild]` Sub does not run, and nothing says so, when a module is named like the project" (bugs/module-named-like-project/); the two may share one cause, a name lookup that finds the module where it wants the procedure. docs/Reference/Attributes.md (#runafterbuild) carries this in the same WARNING callout as that entry; once a fixed build is released, its sentences about a procedure named like its module go. -->
