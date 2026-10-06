Filed as [twinbasic/twinbasic#2498](https://github.com/twinbasic/twinbasic/issues/2498).

## The IDE reverses the order of a project's files at each compiler restart, target switch and Save, and the code of a build follows that order

**Describe the bug**
The code of a built exe follows the order of the project's files, and the IDE reverses that order each time the compiler is restarted (the toolbar's restart button) and each time the build target is switched. Save writes the reversed order to the project file. So an unchanged project builds to exes whose code sits in another order: open it, press Build, press the restart button, press Build again, and the two exes hold the same procedures in a different order.

In the attached project, the classes `ClsX` and `ClsY`, which nothing references, are laid out with `ClsX`'s code before `ClsY`'s in the first exe and after it in the second. A second restart and Build lays the third exe out as the first. The exe shows the order itself: `Sub Main` searches the exe's own `.text` section, as it is mapped in memory, for the four bytes of the constant that each class's procedure returns, and says in a message box which comes first.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `restart-reverses-file-order.twinproj` (attached as `restart-reverses-file-order.zip`). It holds the module `Startup`, whose `Main` calls `FormF.F1()` and `S1()`, the form `FormF`, and the classes `ClsX` and `ClsY`, which nothing references. Each procedure returns a constant of its own: `X1` in `ClsX` returns `&H5A120001`, and `Y1` in `ClsY` returns `&H5A130001`. `Main` then searches the exe's `.text` section for the bytes of those two constants and shows where each sits, and which comes first.
2. Press Build. The project opens for win32, so the exe is `Build\RestartReversesFileOrder_win32.exe`. Run it: its box ends `X1 comes first.`
3. Press the toolbar's restart button for the compiler, wait for the status bar to say `tB Services: OPERATIONAL`, press Build again, and run the exe: its box now ends `Y1 comes first.`
4. Press the restart button and Build once more: the exe says `X1 comes first.` again.
5. Close the IDE without saving, open the project again, switch the build target to win64 in the toolbar's build configuration box, Build, and run `Build\RestartReversesFileOrder_win64.exe`: it says `Y1 comes first.`, though the project file lists `ClsX.twin` before `ClsY.twin`.
6. To check the exe's answer without running it, search the exe file for the bytes `01 00 12 5A` (`X1`) and `01 00 13 5A` (`Y1`): they sit at the offsets into `.text` that the box gives.
7. Close the IDE, open the project again, and Save. The file Save writes holds the entries of every folder in the reverse order: its `Sources` lists `Startup.twin, FormF.twin, FormF.tbform, ClsY.twin, ClsX.twin`, where the attached file lists `ClsX.twin, ClsY.twin, FormF.tbform, FormF.twin, Startup.twin`.

**Expected behavior**
The build does not depend on the order of the project's files, so two builds of one unchanged project hold their code in the same order. If the order matters, the IDE keeps it stable: a compiler restart, a switch of the build target and Save leave the order of the project's files as it was.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 997

**Additional context**
Checked on BETA 997 only, for win32 and win64. Every restart or switch reverses the order again, so a build is laid out in the order of the opened file after an even number of them, and in the reverse after an odd number. A new session builds in the order its file holds, so a Save also changes the first build of the next session. The file Save writes is reversed after none or two restarts and switches, and unchanged after one.

What does not matter: two project files that differ only in the order of their entries build differently, with the same settings and the same revision numbers in both. Reversing only the top-level entries (`Settings`, `Sources`) changes nothing.

In the minimal project, only the unreferenced classes that a referenced form keeps move. Without a referenced form the classes are not in the exe at all, and the order has no visible effect. A referenced class, or a referenced module function, does not keep them. Procedures that `Main` reaches stay in the order `Main` reaches them, and procedures of a module that nothing calls are not in the exe.

No difference in behaviour is known, only in the layout: the two exes differ in `.text` and in about 340 bytes of `.rdata`. Whether a program can behave differently, for instance by creating objects in the order of the classes' files, was not tried.

The same reversal makes the TB5074 of [#2492](https://github.com/twinbasic/twinbasic/issues/2492) come and go. That project lists `Probe.twin` before `ProbeDog.twin`, and in one session its compile reports TB5074 after the open, none after a switch to win64, TB5074 again after the switch back, and a restart does the same. A new session that opens the unchanged file starts with the error.

Severity: low for a program, since no behavioural difference is known. A build depends on how many times the compiler was restarted in the session, so two exes of one unchanged project differ. A defect that depends on the order of the files, such as #2492, appears and disappears with each restart or switch, which makes it hard to reproduce and to test a fix for.

<!-- Asserted by `ide-test.bat --only restart-file-order` (test/ide/restart-file-order.test.mjs, two scenarios. In one IDE: the first build lays the code out X1 Y1 F1 S1, after a restart Y1 X1 F1 S1, after a second restart X1 Y1 F1 S1 again, and Save then writes the entries of every folder in the reverse of the order they were opened in. In a second IDE, on the project opened afresh: a build for win32 gives X1 Y1 F1 S1 and, after a switch to win64, Y1 X1 F1 S1); passes on BETA 997, about 52 s a run. The reproducer's sources are those of test/ide/probes/restart-file-order, with another name, description and project id in Settings. The lane also runs each exe it builds on a private desktop, reads the box Main shows, and asserts that the exe's own search agrees with the file (win32 and win64). The lane reads the order of the four constants in .text and never a hash of it, because two win32 builds of one order also differ in other bytes (see "A build writes addresses from the compiler's own memory into the exe"). It leaves 21 seconds between one restart or switch and the next, and checks the build box (buildConfigSelector) before each build, because four unexpected compiler restarts within a minute put the IDE into Safe Mode, where the box says nocompile; whether the restart button counts is not known. Checked on BETA 997 and not asserted: Save right after opening, each further switch reversing the order again, Save after one switch leaving the order unchanged, the first build after reopening a saved file, the TB5074 sequence of #2492 (bugs/filed/static-ctor-args), the .rdata difference, and the classes' absence without a referenced form. When fixed: update that test and this entry. -->
