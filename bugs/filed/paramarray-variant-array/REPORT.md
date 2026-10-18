Filed as [twinbasic/twinbasic#2530](https://github.com/twinbasic/twinbasic/issues/2530).

## A `ParamArray` element that is a `Variant` variable holding an array cannot be indexed or assigned to an array: error -2147467259

**Describe the bug**
When the argument passed to a `ParamArray` is a `Variant` variable that holds an array, the procedure cannot use the element as an array. Assigning it to an array variable of any type, indexing it to read or to write an element, and passing it on to another `ParamArray` that indexes it raise run-time error -2147467259, *Unspecified error*; `Join` raises error 13. VB6 does all of these without an error. `LBound`, `UBound`, `IsArray`, `VarType` and `For Each` work on the same element. Observed in the reproducer project's regression tests and in a run of its `Sub Main`.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `paramarray-variant-array.twinproj` (attached as `paramarray-variant-array.zip`). Its module `Cases` holds 28 cases: each passes a small array to a `ParamArray` function in one way, does one thing with `parts(0)`, and returns what that gives, or `error <number>`. Its module `ParamArrayTests` holds one `[TestCase]` per case, asserting what the case gives in VB6.
2. Run it (F5). `Sub Main` prints what each case gives; the same program built in VB6 (attached as `paramarray-variant-array-vb6.zip`) prints what VB6 gives:

   | the argument | what the function does with `parts(0)` | twinBASIC | VB6 |
   |---|---|---|---|
   | `b`, a `Byte()` variable | `a = parts(0)`, `a() As Byte` | `2 98` | `2 98` |
   | `v`, a `Variant` variable holding a `Byte()` | `a = parts(0)`, `a() As Byte` | error -2147467259 | `2 98` |
   | a `Variant` variable holding a `Long()`, `String()`, `Double()` or `Variant()` | `a = parts(0)`, `a()` of that type | error -2147467259 | `2 7`, `2 y`, `2 2.5`, `2 y` |
   | `v` | `x = parts(0)(1)` | error -2147467259 | `98` |
   | a `Variant` variable holding a two-dimensional `Long()` | `x = parts(0)(1, 2)` | error -2147467259 | `12` |
   | a `Variant` variable holding `Array(1, 2, 3)` | `parts(0)(1) = 99` | error -2147467259, and the caller's element 1 stays 2 | no error, and the caller's element 1 is 99 |
   | a `Variant` variable holding a `String()` | `Join(parts(0), "+")` | error 13 | `x+y+z` |
   | `v` | passed on to another `ParamArray` function, which indexes its element | error -2147467259 | `98` |
   | a `Variant` variable holding `Array(1, -2, 300, 20.3)` | the `Max` and `UnpackParamArray` of #1660 | error -2147467259 | `300` |
   | a module-level `Variant`, an element of a `Variant()` array, a `Variant` field of a UDT, or a `ByVal` or `ByRef` `Variant` parameter passed on | `x = parts(0)(1)` | error -2147467259 | `98` |
   | `v`, to a class's method that takes the `ParamArray`, called early- or late-bound | `x = parts(0)(1)` | error -2147467259 | `98` |
   | `v` | `LBound` and `UBound`; `IsArray` and `VarType`; `For Each` | `0 to 2`; `True 8209`; the sum | the same |
   | `v` | passed on to a `ByVal x As Variant` parameter, which indexes it | `98` | `98` |
   | `v` | the whole `ParamArray` passed on to another, which reads `q(0)(0)(1)` | `98` | `98` |
   | `v` | `x = parts(0)`, then `x(1)` | `98` | `98` |
   | `(v)`, `CVar(b)`, or a function's `Variant` result | `x = parts(0)(1)` | `98` | `98` |

**Expected behavior**
What VB6 gives, in every case. The element refers to the caller's `Variant`, which holds an array: assigning the element to an array variable copies that array, indexing it reads or writes the array's elements, and `Join` joins them.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1005

**Additional context**
The same on BETA 997 and 957, and in a built exe. In an exe compiled with LLVM every case gives the same, but for the case of #1660, which ends the program with an access violation: its error is raised in `UnpackParamArray`, which has no error handler, and is not passed on to the handler of its caller, a separate defect of LLVM-compiled code.

What does not reproduce it: an argument that is an array variable, or an expression such as `(v)`, `CVar(b)` or a function's result, which passes a copy rather than a reference to a `Variant`; the element read into a local `Variant` first, or passed to a `ByVal Variant` parameter; the whole `ParamArray` passed on to another; and outside a `ParamArray`, a `ByRef Variant` parameter (`a = v` works) or an element of a `Variant()` array assigned in the procedure the array is passed to.

#1660 (open) is this defect reached another way: its unpacking routine is one of the cases, and fails as reported there. This entry narrows it to the element of a `ParamArray` that refers to a `Variant` variable, and shows what else fails with it.

Severity: moderate. An error is always raised, so nothing goes wrong silently, but VB6 code that forwards a `Variant` array through a `ParamArray`, such as a `Max` or `Concat` helper or the unpacking routine of #1660, fails, and *Unspecified error* gives no hint why. Reading the element into a `Variant` first avoids it.

<!-- Reproducer: bugs/paramarray-variant-array/ (mode test: `tbrun --tests` runs the 28 [TestCase]s of ParamArrayTests; expect lists the ten PASS and eighteen FAIL lines, each FAIL with what BETA 1005 gives). verify reproduces on BETA 957, 997 and 1005; VB6 side in vb6/ (VB6 6.0): `bug_repro.mjs vb6` prints the table's VB6 column, which the test cases assert. The built-exe and LLVM results are from `tbrun --exe` and `tbrun --exe --llvm` on a scratch copy whose Startup prints with TbRun.Out, not kept. Found while writing scripts/imagestrip/'s twinBASIC tests: TestImages.Cat in scripts/imagestrip/src/Sources/Tests/TestImages.twin copies each ParamArray element through a Variant to work around it, and its comment names this entry. Stated in a NOTE naming BETA 1005 in docs/Reference/Core/ParamArray.md. When fixed, the NOTE goes, ParamArray.md states nothing about it, and Cat's workaround and comment go. Filing it new, or commenting on #1660 with this narrowed form and marking it CAPTURED IN EXISTING #1660, is the owner's call. -->
