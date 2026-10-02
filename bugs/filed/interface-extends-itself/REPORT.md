Filed as [twinbasic/twinbasic#2434](https://github.com/twinbasic/twinbasic/issues/2434).

## An `Interface` that extends itself compiles without a diagnostic, and Build then does nothing

**Describe the bug**
An interface that extends itself, directly or through another interface, compiles with no error, warning, hint or info. Building the project then does nothing at all: clicking **Build** writes nothing to the DEBUG CONSOLE, opens no dialog and creates no file, and the IDE stays responsive. A cycle through classes or UDTs is refused at compile time instead.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `interface-extends-itself.twinproj` (attached as `interface-extends-itself.zip`). Its three source files hold the whole bug:
   ```
   ' SelfCycle.twin
   Interface IA Extends IA
   End Interface
   
   ' PairCycleB.twin
   Interface IB Extends IC
   End Interface
   
   ' PairCycleC.twin
   Interface IC Extends IB
   End Interface
   ```
2. See the project compile with 0 errors, 0 warnings, 0 hints and 0 infos.
3. Click **Build**.
4. See nothing happen: no `[BUILD] Starting...` line in the DEBUG CONSOLE, no message, no output file.

Any one of the three files is enough on its own; so is `IB` and `IC` in one file.

**Expected behavior**
A compile error, as the other kinds of cycle get:

| source | result |
|---|---|
| `Class CA` + `Inherits CA` + `End Class` | TB5127 circular reference |
| `Class CA` inheriting `CB` and `Class CB` inheriting `CA`, two files | TB5127 circular reference, TB5022 and TB5135 failed to import inherited members |
| `Type TA` holding a `TB` and `Type TB` holding a `TA`, two modules | TB5101 unable to finalize User Defined Type, possible circular reference |

Failing that, a build that reports why it stopped.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Also on BETA 983, identically. The same project without the cyclic interfaces builds in about 16 seconds on both, and so does one with an ordinary chain, `Interface IQ Extends IP`. Severity: invalid code is accepted, and the only symptom is a Build button that silently does nothing.

<!-- Measured with scripts/bug_repro.mjs and tbbuild --build (exit 5, "the build did not start in 120 s") on 995 and 983, control and IQ-extends-IP chain built; the silent Build button seen by hand on 995 (IDE shown). The class and UDT rows measured on 995 the same way. Found while looking for a compiler crash that needs two files. -->
