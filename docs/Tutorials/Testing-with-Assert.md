---
title: Writing unit tests with Assert
parent: Tutorials
permalink: /Tutorials/Testing-with-Assert
---

# Writing unit tests with Assert
{: .no_toc }

This tutorial shows how to write a small function, add tests for it using the **Assert** package, and run those tests from inside the IDE. It starts from a new **Standard EXE** project, created as in [Hello World](Hello-World).

- TOC
{:toc}

## The Assert package

The [Assert package](../tB/Packages/Assert/) provides three modules --- [**Exact**](../tB/Packages/Assert/Exact), [**Strict**](../tB/Packages/Assert/Strict), and [**Permissive**](../tB/Packages/Assert/Permissive) --- that share the same fifteen-member API:

| Module | String comparison | Numeric datatype must match |
|--------|-------------------|-----------------------------|
| **Exact** | Case-sensitive | Yes --- `5` and `5.0` are not equal |
| **Strict** | Case-sensitive | No |
| **Permissive** | Case-insensitive | No |

All three compile out of release builds: every member is tagged `[DebugOnly(True)]`, so assertion calls have zero runtime cost in production EXEs. Tests live in the same project as production code and run in the IDE under the full debugger.

The most commonly used members are:

- `Assert.Exact.AreEqual expected, actual` -- fails if the two values differ
- `Assert.Exact.IsTrue condition` -- fails if the condition is `False`
- `Assert.Exact.IsFalse condition` -- fails if the condition is `True`
- `Assert.Exact.Fail message` -- unconditionally records a failure
- `Assert.Exact.Succeed` -- explicitly records a pass (useful at the end of conditional paths)

An assertion that holds does nothing visible. One that fails stops the run on its own line with the run-time error **Assertion FAILED**, and the IDE shows that line. The expected and actual values and the optional message are not displayed anywhere, so the name of the failing test and the line it stopped on are what identify a failure.

## Adding the package

Open **Project → References** (Ctrl+T) → **Available Packages** and tick **twinBASIC - Unit Testing Package**, the row whose library symbol is **Assert**. Press **Apply Changes**. The three modules (`Exact`, `Strict`, `Permissive`) are now available, and every call names both the package and the module: `Assert.Exact.AreEqual`, never `Exact.AreEqual` or `AreEqual` alone, which do not compile. [Calling convention](../tB/Packages/Assert/#calling-convention) explains why.

## The function under test

Add a standard **Module** to the project (right-click the project in the Project Explorer, then **Add → Module**). Name it `StringUtils`. Add the following function:

```tb check_build projname=padleft-tests
' Pads s on the left with padChar until it reaches totalWidth characters.
' If s is already at or beyond totalWidth, it is returned unchanged.
Public Function PadLeft(ByVal s As String, _
                        ByVal totalWidth As Long, _
                        Optional ByVal padChar As String = " ") As String
    If Len(s) >= totalWidth Then
        PadLeft = s
    Else
        PadLeft = String(totalWidth - Len(s), Left$(padChar, 1)) & s
    End If
End Function
```

`PadLeft` is a good test subject: it has a clear specification, an optional parameter with a default, and several distinct edge cases.

## Writing the tests

Add a second module, `TestStringUtils`. Each test is a `Public Sub` that exercises one aspect of the function. Keep each Sub short --- ideally one logical scenario per Sub, named to describe what it checks.

```tb check_build projname=padleft-tests
Public Sub TestPadLeft_Normal()
    ' Three spaces prefix "hi" to reach width 5
    Assert.Exact.AreEqual "   hi", PadLeft("hi", 5)
End Sub

Public Sub TestPadLeft_CustomPadChar()
    ' Zero-pad to width 5
    Assert.Exact.AreEqual "00042", PadLeft("42", 5, "0")
End Sub

Public Sub TestPadLeft_AtWidth()
    ' Already at width -- no change
    Assert.Exact.AreEqual "hello", PadLeft("hello", 5)
End Sub

Public Sub TestPadLeft_ExceedsWidth()
    ' Already longer than width -- not truncated
    Assert.Exact.AreEqual "toolong", PadLeft("toolong", 5)
End Sub

Public Sub TestPadLeft_EmptyString()
    ' Empty input -- result is all padding
    Assert.Exact.AreEqual "   ", PadLeft("", 3)
End Sub

Public Sub TestPadLeft_SingleChar()
    ' Width of 1, input already 1 char -- no change
    Assert.Exact.AreEqual "x", PadLeft("x", 1)
End Sub
```

These tests cover: the normal case, a custom pad character, the at-boundary case, the over-boundary case, an empty input, and a minimal input.

## Running the tests

There are two ways to run a test Sub:

1. **CodeLens** --- above each `Sub` line, the editor shows a **▶ run** link. Click it to run that one Sub. A test that passes returns without printing anything; one that fails stops on the failing assertion, as described below.

2. **F6 from inside the Sub** --- place the cursor inside the Sub and press **F6**. twinBASIC runs that procedure and stops when it returns or when an assertion fails. **F5** does not do this: it starts the whole project, as **Run → Start** does.

To run all tests in a batch, add a runner Sub to `TestStringUtils` that calls each test in sequence:

```tb check_build projname=padleft-tests
Public Sub RunAllTests()
    TestPadLeft_Normal
    TestPadLeft_CustomPadChar
    TestPadLeft_AtWidth
    TestPadLeft_ExceedsWidth
    TestPadLeft_EmptyString
    TestPadLeft_SingleChar
    Debug.Print "All PadLeft tests passed."
End Sub
```

Place the cursor inside `RunAllTests` and press **F6**, or click the **▶ run** link above it. When every test passes, the Debug Console shows the one line the runner prints:

```text
All PadLeft tests passed.
```

If an assertion fails, the run stops on that line with the run-time error **Assertion FAILED** (-353703420, `&HEAEAEA04`), before the final `Debug.Print`. The IDE shows the failing line, and the call stack names the test it is in. The error panel under the line has four buttons: **Try Again (Resume)**, **Ignore (Resume Next)**, **Stop** and **Search Online**. [When a run-time error stops the program](../tB/IDE/Project/Menu/Debug#when-a-run-time-error-stops-the-program) describes them, and how to look at the test's variables. Nothing about the failure is written to the Debug Console, and the expected and actual values are not shown.

> [!IMPORTANT]
> **Stop** and **Ignore (Resume Next)** do not end the run at a failed assertion. Both let the test go on past the failed check as if it had passed, so `RunAllTests` runs the remaining tests and then prints `All PadLeft tests passed.` To end the run, click the failing test's `End Sub` line, press **Ctrl+F9** (**Debug → Set Next Statement**), then choose **Run → End**.

## Testing error paths

Sometimes a function should raise an error for bad input. Test that with `On Error Resume Next` and `Err.Number`:

```tb check_build projname=padleft-tests
Public Sub TestPadLeft_ZeroWidth()
    ' A width of 0 is technically valid -- the string is returned unchanged
    ' if it is already zero-length, and unchanged otherwise.
    Assert.Exact.AreEqual "hi", PadLeft("hi", 0)
    Assert.Exact.AreEqual "", PadLeft("", 0)
End Sub
```

If instead you expected the function to raise an error:

```tb hidden
' Context for the sample below: the function under test, which raises.
Public Sub SomeFunctionThatRaises(ByVal Value As Long)
End Sub
```

```tb check_build
Public Sub TestSomethingThatShouldRaise()
    On Error Resume Next
    SomeFunctionThatRaises 0    ' call that should fail
    If Err.Number = 0 Then
        Assert.Exact.Fail "expected an error, but none was raised"
    End If
    On Error GoTo 0
End Sub
```

`On Error Resume Next` does not swallow the **Fail**: a failing assertion stops the run even while it is in effect, so the test above fails whenever the call returns without an error.

## Choosing the right module

Use **Exact** by default --- its strictest comparison semantics prevent tests from passing for the wrong reason. Switch to **Strict** or **Permissive** when the code under test is intentionally case-insensitive or when you are comparing values that should be equal regardless of numeric type:

```tb check_build
' Strict compares strings case-sensitively; Permissive does not
Assert.Permissive.AreEqual "HELLO", LCase$("HELLO")  ' passes -- case-insensitive
Assert.Strict.AreEqual "HELLO", LCase$("HELLO")      ' fails -- "hello" ≠ "HELLO"
```

The three modules are documented in full at:

- [Exact module](../tB/Packages/Assert/Exact) -- strictest semantics
- [Strict module](../tB/Packages/Assert/Strict) -- case-sensitive strings, type-lenient numeric
- [Permissive module](../tB/Packages/Assert/Permissive) -- case-insensitive strings, type-lenient numeric

## Test organisation

As a project grows, keep tests close to the code they exercise. One common convention:

- One production module per concern: `StringUtils`, `DateUtils`, `FileHelpers`, …
- One test module per production module: `TestStringUtils`, `TestDateUtils`, `TestFileHelpers`, …
- A top-level `RunAll` Sub in a `TestRunner` module that calls each module's runner

Because all test Subs are compiled out of release builds (`[DebugOnly(True)]`), this organisation adds no overhead to the shipped executable.

## Where to go next

- **Assert package reference** -- all fifteen members in detail: [Assert package](../tB/Packages/Assert/)
- **Forms basics** -- building a form to host a small test harness visually: [Forms basics](Forms)
- **Windows API** -- writing and testing a function that wraps a Declare: [Calling the Windows API](Windows-API)
