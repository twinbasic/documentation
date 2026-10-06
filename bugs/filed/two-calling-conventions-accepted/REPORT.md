Filed as [twinbasic/twinbasic#2480](https://github.com/twinbasic/twinbasic/issues/2480).

## A declaration that names two calling conventions compiles without a diagnostic

**Describe the bug**
An API declaration, a procedure, a delegate or an interface member can name its calling convention after its name, and the compiler accepts two conventions on one declaration, in either order, with no error or warning. The call then uses one of them. In every pair tried on a `Declare`, `CDecl` is dropped and the other keyword is used, whichever comes first.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `two-calling-conventions-accepted.twinproj` (attached as `two-calling-conventions-accepted.zip`). Its `Startup.twin` declares `RtlUlongByteSwap`, which `ntdll` exports as fastcall on a 32-bit build (its one argument in ECX), under several conventions:
   ```
   Private Declare PtrSafe Function SwapFast FastCall Lib "ntdll" Alias "RtlUlongByteSwap" (ByVal Source As Long) As Long
   Private Declare PtrSafe Function SwapCdecl CDecl Lib "ntdll" Alias "RtlUlongByteSwap" (ByVal Source As Long) As Long
   Private Declare PtrSafe Function SwapFastCdecl FastCall CDecl Lib "ntdll" Alias "RtlUlongByteSwap" (ByVal Source As Long) As Long
   Private Declare PtrSafe Function SwapCdeclFast CDecl FastCall Lib "ntdll" Alias "RtlUlongByteSwap" (ByVal Source As Long) As Long
   Private Declare PtrSafe Function SwapThisCdecl ThisCall CDecl Lib "ntdll" Alias "RtlUlongByteSwap" (ByVal Source As Long) As Long
   Private Declare PtrSafe Function SwapCdeclThis CDecl ThisCall Lib "ntdll" Alias "RtlUlongByteSwap" (ByVal Source As Long) As Long
   ```
   It also holds a delegate (`CDecl FastCall`), a procedure in a module (`CDecl ThisCall`) and an interface member (`ThisCall CDecl`), each naming two conventions. `Sub Main` prints the result of each `Declare` for `&H11223344`.
2. Compile it. The Problems panel reports 0 errors and 0 warnings.
3. Run it (win32). The DEBUG CONSOLE prints:
   ```
   FastCall:        44332211
   FastCall CDecl:  44332211
   CDecl FastCall:  44332211
   ThisCall CDecl:  44332211
   CDecl ThisCall:  44332211
   CDecl:           1EEC6F00
   ```
   The last value changes from run to run: called as cdecl, the function swaps whatever ECX held. Every pair is called as fastcall or thiscall, which pass this one argument the same way.

**Expected behavior**
A declaration has one calling convention, so the second keyword is refused with an error that names it. As it is, nothing says which of the two the call uses, and when one of them is `CDecl`, it is dropped without a word.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 997

**Additional context**
Also on BETA 995, identically apart from the cdecl value.

Only the `Declare` pairs are observed at run time. The delegate, the procedure and the interface member are only compiled, so which convention they use is not known. Not tried: `FastCall` with `ThisCall`, which this function cannot tell apart, and a 64-bit build, where the conventions have no effect.

Severity: low. It takes a mistake to trigger it, but the mistake goes unreported, and a declaration meant as cdecl that names a second convention by accident calls the function the wrong way.

<!-- Reproducer: bugs/two-calling-conventions-accepted/ (mode run, expects exit 0 and the four pair lines with 44332211); verified on BETA 995 and 997 by `bug_repro.mjs verify` and `run`, and `compile` reports no diagnostic on 997. Stated in docs/Features/Advanced/API-Declarations.md, section "Calling Conventions", the sentences after the table that begin "Name at most one convention" (they name BETA 997): when fixed, say that a second convention is an error, with no mention of the defect. -->
