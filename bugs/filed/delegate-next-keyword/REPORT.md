Covered by the existing issue [twinbasic/twinbasic#2001](https://github.com/twinbasic/twinbasic/issues/2001).

## After a Delegate, the next Friend, ReadOnly, WithEvents, Implements or Inherits is a syntax error

**Describe the bug**
After a `Delegate` statement, the compiler no longer recognises five words. The next `Friend`, `Implements` or `Inherits` gives TB5182, *Syntax error. No handler for this symbol*, on the word, and the next `ReadOnly` or `WithEvents` gives it on the name that follows. The code is correct: the same line compiles when it is placed before the `Delegate`.

Issue #2001 reports the `ReadOnly` half of this. This entry adds the other four words and what ends the effect.

**To Reproduce**
Steps to reproduce the behavior:
1. Create a new project and add this class, or open `delegate-next-keyword.twinproj`, which also has every case below:

   ```vb
   Class MyClass
       Private Delegate Function TestDelegate () As Long

       Friend Sub Test()
       End Sub
   End Class
   ```
2. See TB5182 on `Friend`.
3. Replace `Friend` with `Public` or `Private`. The error goes away.

What decides it, each a compile case of the project:
- The words affected: `Friend` (on a Sub, a Function, a Property or a variable), `ReadOnly`, `WithEvents`, `Implements`, `Inherits`.
- Not affected, directly after a `Delegate`: `Public`, `Private`, `Dim`, `Const`, `Static`, `Protected`, `Overridable`, `Sub`, `Function`, `Property`, `Declare`, `Event`, `Type`, `Enum`.
- Every form of `Delegate` does it: `Function` or `Sub`, `Public` or `Private`, with arguments or a calling convention, in a Class or a Module.
- A blank line, a comment, a variable, a `Const`, a `Type`, an `Enum`, an attribute or a second `Delegate` between the two leave the error in place.
- A procedure, a `Declare` or an `Event` between the two ends the effect. `Friend` after `Friend` does not fail a second time either, once the first has given its error.
- Each word compiles after a variable, a `Const` or a `Sub` when there is no `Delegate`, and before a `Delegate`. A class may use a delegate type declared lower down.
- The next block of the file is not affected: a Class after a Module that ends in a `Delegate` compiles.

**Expected behavior**
No diagnostic. `Delegate` declarations have no effect on the lines after them.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1034, and BETA 1007; #2001 saw the `ReadOnly` half on BETA 644

**Additional context**
What a `Sub`, a `Declare` and an `Event` share, and a `Delegate` lacks, is not known from outside the compiler. `Friend` is not a reserved word (`Dim Friend As Long` compiles), so the fault may be in how the parser decides that such a word is a keyword.

A way round it: put the `Delegate` after these statements, at the end of the class if necessary.

Severity: low to medium. Nothing is miscompiled, but a correct line is refused with a message that does not point at the `Delegate`, and the reader has no reason to look there.

<!-- Reproducer: bugs/delegate-next-keyword/ (mode test: 31 compile cases, 16 of which fail with TB5182 on the correct line; two cases of the first attached zip put `ReadOnly` in a Module, where it is not valid and draws TB5182 with no Delegate near it, as Wayne said on #2001, and they are gone; the Cleared_ and Control_ cases pass). Reported on Discord by VanGoghGaming with the sample above. Pages with a callout that goes when this is fixed: docs/Reference/Core/Friend.md, docs/Reference/Core/Delegate.md, docs/Features/Advanced/Classes-and-Modules.md (ReadOnly Variables), docs/IDE/Code/Diagnostics.md (TB5182). -->
