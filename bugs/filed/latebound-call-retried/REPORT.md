Filed as [twinbasic/twinbasic#2491](https://github.com/twinbasic/twinbasic/issues/2491).

## A late-bound call that passes arguments and fails is issued a second time, without them

**Describe the bug**
When a late-bound call that passes arguments fails, twinBASIC calls `Invoke` a second time, as a property read (`wFlags` 3) with no arguments. A `Sub` called with an argument it does not take therefore runs twice before error 13 is raised, a failed property assignment runs the property's `Property Get` afterwards, and the error the caller sees is replaced. Observed in a run of the reproducer project, and with `Invoke` implemented by a class that records its calls.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `latebound-call-retried.twinproj` (attached as `latebound-call-retried.zip`). Its one source file, `Startup.twin`, holds a class and `Sub Main`. `Widget` has `Sub Hello()`, which counts how often it runs, and a `Property Let Prop` that raises error 5 beside a `Property Get Prop` that counts how often it runs.
2. Run it. `Main` calls `o.Hello 1` and `o.Prop = 1` through `Dim o As Object = New Widget`, with `On Error Resume Next`, and prints the error and the counts after each:
   ```
   o.Hello 1: error 13, ran 2 time(s), Property Get ran 0
   o.Boom 1: error 5, ran 1 time(s), Property Get ran 0
   x = o.BoomFn(1): error 5, ran 1 time(s), Property Get ran 0
   o.Prop = 1: error -2147352567, ran 1 time(s), Property Get ran 1
   w.Boom 1 (early bound): error 5, ran 1 time(s), Property Get ran 0
   ```
3. See `Hello` run twice, and `Property Get Prop` run after the `Property Let` that failed. The error from the assignment is `&H80020009` (`DISP_E_EXCEPTION`) where the `Property Let` raised 5.
4. To see the second call, implement `IDispatch` in a `NotDispatchable` class whose `Invoke` prints `wFlags`, `pDispParams.cArgs` and whether `pVarResult` is null, and returns a failure code. With `Fail3` returning `DISP_E_TYPEMISMATCH` and `Fail5` raising error 5:
   ```
   o.Fail3 1      Invoke flags=1 cArgs=1 result=null, then Invoke flags=3 cArgs=0 result=set
   o.Fail3 = 5    Invoke flags=4 cArgs=1 result=null, then Invoke flags=3 cArgs=0 result=set
   o.Fail5 = 5    Invoke flags=4 cArgs=1 result=null, then Invoke flags=3 cArgs=0 result=set
   Set o.Fail1 = e   Invoke flags=8 cArgs=1 result=null, then Invoke flags=3 cArgs=0 result=set
   ```

**Expected behavior**
One `Invoke` per late-bound call, as a raw `Invoke` does: calling `Invoke` directly with the same argument runs `Hello` once and returns `DISP_E_TYPEMISMATCH`. In VB6 the same two statements fail without running anything the callee counts: `o.Hello 1` raises error 450, *Wrong number of arguments or invalid property assignment*, with `Hello` run 0 times, and `o.Prop = 1` raises error 5 from the `Property Let` with the `Property Get` run 0 times. The VB6 project is attached as `latebound-call-retried-vb6.zip`; it prints `o.Hello 1 -> error 450 (1C2) [Wrong number of arguments or invalid property assignment]` with `Hits=0`, and `o.Prop = 1 -> error 5 (5) [Invalid procedure call or argument]` with `Hits=1 Gets=0` (the one run is the `Property Let`). At the least a failed call must not run the callee again, and the error of the assignment must be the one the `Property Let` raised.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: a late-bound call with a wrong argument count has side effects twice, and a late-bound property assignment that fails calls the getter, which may be expensive or have effects of its own.

What does not reproduce it: a statement with no arguments (`o.Fail3`, `o.Hello`, `x = o.Fail3`); a statement that raises from inside the callee (`o.Boom 1` and `x = o.BoomFn(1)` run once and keep error 5); `CallByName` with an argument, for every call type (one `Invoke`); a call that succeeds; early-bound calls. What does reproduce it: `o.Hello 1`, `o.Hello(1)`, `o.Hello 1, 2`, the same through a `Variant` holding the object, and `o.Fn 1` for a `Function` with no parameters (ran twice, error 13). An assignment is repeated whatever the failure was (`DISP_E_TYPEMISMATCH`, `DISP_E_MEMBERNOTFOUND`, `E_FAIL`, an error raised by the setter); a statement call is repeated after `DISP_E_TYPEMISMATCH`, but not after an error raised in the callee.

The second call resembles VB's rule for `o.Member(args)` on a property that returns an object or a collection: read the property with no arguments, then apply the arguments to the result. It is applied after a failure of any call that has arguments. The single run of `Hello` in the raw `Invoke` case is also at odds with the COM contract, which gives `DISP_E_BADPARAMCOUNT` for too many arguments without running the member; it is left out of this entry.

<!-- Reproducer: bugs/latebound-call-retried/ (mode run, expects the Hello and Prop lines above); verified on 995. VB6 side in bugs/latebound-call-retried/vb6/ (o.Hello 1 -> 450 and Hits=0; o.Prop = 1 -> 5 and Gets=0). Stated in docs/Reference/COM-Interfaces/IDispatch.md, the second callout under "Errors from a late-bound call", a WARNING naming BETA 995 (a call that fails inside Invoke can be made twice) and the first row of the table under "Classes written in twinBASIC" in the same page. When fixed, reduce that NOTE to the CallByName part (see callbyname-membernotfound-retried), or delete it, and remove the sentence about "a late-bound statement does this twice". The Property Get run and the replaced error number are not on the page yet. -->
