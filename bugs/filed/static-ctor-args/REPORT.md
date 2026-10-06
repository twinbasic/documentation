Filed as [twinbasic/twinbasic#2492](https://github.com/twinbasic/twinbasic/issues/2492).

## A `Static` in a Module procedure cannot be initialised with an argument constructor of a class declared later in the project

**Describe the bug**
A `Static` variable in a Module procedure, initialised with `New` and a constructor that takes arguments, fails with TB5074 when the class is declared later in the project than the Module, in another file or further down the same file. With the class declared first, the same line compiles. `Dim` with the same initialiser compiles in both orders, so the declaration's position in the project changes whether a valid `Static` compiles.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `static-ctor-args.twinproj` (attached as `static-ctor-args.zip`). The project lists `Probe.twin`, which holds the Module, before `ProbeDog.twin`, which holds the class:
   ```
   ' Probe.twin
   Module Probe
       Public Sub T()
           Static s As Dog = New Dog("Rex")
           Debug.Print s.GetName()
       End Sub
   End Module
   
   ' ProbeDog.twin
   Private Class Dog
       Private m_Name As String
       Public Sub New(ByVal Name As String)
           m_Name = Name
       End Sub
       Public Function GetName() As String
           Return m_Name
       End Function
   End Class
   ```
2. See the project fail to compile with `TB5074 Could not bind to parameterized constructor of class 'Dog'. No compatible Sub New() method found`, at the `New`.
3. Move the `Dog` class into `Probe.twin`, above the Module: the project compiles with no error.

What does not reproduce it, each measured with the class declared later than the Module unless it says otherwise: `Dim s As Dog = New Dog("Rex")` compiles, and so does `Static s As Dog` with `Set s = New Dog("Rex")`; a `Static` with a constructor that takes no arguments compiles; the same `Static` in a method of a Class compiles; and the same `Static` with the class declared first compiles, in a Module procedure, a Function, a Class method and a Property Get, in one file or two, with the class `Private` or `[COMCreatable(False)]`. The failure holds for a `Private` class and a public `[COMCreatable(False)]` one, and with a second constructor beside the one that takes arguments.

**Expected behavior**
The declaration compiles whichever of the Module and the class comes first, as `Dim` does and as `Static` does when the class is first.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Also on BETA 983. Severity: a valid declaration does not compile, and which projects it affects depends on file order, so it appears and disappears as files are added. The workaround is a `Static` without an initialiser and a `Set` on first use, or declaring the class first. The order is the order of the files inside the `.twinproj`; the reproducer is packed with `Probe.twin` before `ProbeDog.twin`.

<!-- Reproducer: bugs/static-ctor-args/ (mode compile, expects TB5074); verified on 995 and on 983. Rewritten 2026-10-02: the entry used to say it did not reproduce on 983 or 995, because every earlier probe declared the class before the module; the order was found when scripts/bug_repro.mjs packed a project differently from the IDE's own import (the IDE's `import` lists files in reverse alphabetical order, scripts/impexp.mjs in alphabetical order) and the same files gave opposite results. Measured with compile probes through tbbuild, in a project of its own for each case. The title changed because it no longer describes the bug; nothing under scripts/ or test/ refers to it. docs/Reference/Core/New.md states the failure as this entry does, naming BETA 995, and tells the reader to use Set: reword it when the bug is fixed. -->
