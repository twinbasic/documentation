---
title: Writing unit tests with Assert
parent: Tutorials
permalink: /Tutorials/Testing-with-Assert
---

# Writing unit tests with Assert
{: .no_toc }

This tutorial shows how to write a small function, add tests for it using the **Assert** package, and run those tests from inside the IDE.

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

- `Exact.AreEqual expected, actual` -- fails if the two values differ
- `Exact.IsTrue condition` -- fails if the condition is `False`
- `Exact.IsFalse condition` -- fails if the condition is `True`
- `Exact.Fail message` -- unconditionally records a failure
- `Exact.Succeed` -- explicitly records a pass (useful at the end of conditional paths)

Each failing assertion records the source location, the expected and actual values, and the optional message string. Results appear in the **Debug Console** pane.

## Adding the package

Open **Project → References** (Ctrl+T) → **Available Packages** and tick **Assert**. Click **OK**. The three modules (`Exact`, `Strict`, `Permissive`) are now in scope without any `Imports` statement.

## The function under test

Add a standard **Module** to the project (right-click the project in the Project Explorer, then **Add → Module**). Name it `StringUtils`. Add the following function:

```tb
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

```tb
Public Sub TestPadLeft_Normal()
    ' Three spaces prefix "hi" to reach width 5
    Exact.AreEqual "   hi", PadLeft("hi", 5)
End Sub

Public Sub TestPadLeft_CustomPadChar()
    ' Zero-pad to width 5
    Exact.AreEqual "00042", PadLeft("42", 5, "0")
End Sub

Public Sub TestPadLeft_AtWidth()
    ' Already at width -- no change
    Exact.AreEqual "hello", PadLeft("hello", 5)
End Sub

Public Sub TestPadLeft_ExceedsWidth()
    ' Already longer than width -- not truncated
    Exact.AreEqual "toolong", PadLeft("toolong", 5)
End Sub

Public Sub TestPadLeft_EmptyString()
    ' Empty input -- result is all padding
    Exact.AreEqual "   ", PadLeft("", 3)
End Sub

Public Sub TestPadLeft_SingleChar()
    ' Width of 1, input already 1 char -- no change
    Exact.AreEqual "x", PadLeft("x", 1)
End Sub
```

These tests cover: the normal case, a custom pad character, the at-boundary case, the over-boundary case, an empty input, and a minimal input.

## Running the tests

There are two ways to run a test Sub:

1. **CodeLens** --- place the cursor anywhere inside a test Sub. The CodeLens bar above the `Sub` line shows a `▶ Run` button. Click it to run that one Sub. The result appears immediately in the **Debug Console**.

2. **F5 from inside the Sub** --- place the cursor inside the Sub and press **F5**. twinBASIC runs the procedure and stops when it returns or when an assertion fails.

To run all tests in a batch, add a runner Sub that calls each test in sequence:

```tb
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

Place the cursor inside `RunAllTests` and press **F5** (or click **▶ Run** in the CodeLens bar). If any assertion fails, execution stops at the failing line and the Debug Console shows which assertion failed, its expected and actual values, and the source location.

## Testing error paths

Sometimes a function should raise an error for bad input. Test that with `On Error Resume Next` and `Err.Number`:

```tb
Public Sub TestPadLeft_ZeroWidth()
    ' A width of 0 is technically valid -- the string is returned unchanged
    ' if it is already zero-length, and unchanged otherwise.
    Exact.AreEqual "hi", PadLeft("hi", 0)
    Exact.AreEqual "", PadLeft("", 0)
End Sub
```

If instead you expected the function to raise an error:

```tb
Public Sub TestSomethingThatShouldRaise()
    On Error Resume Next
    SomeFunctionThatRaises 0    ' call that should fail
    If Err.Number = 0 Then
        Exact.Fail "expected an error, but none was raised"
    End If
    On Error GoTo 0
End Sub
```

## Choosing the right module

Use **Exact** by default --- its strictest comparison semantics prevent tests from passing for the wrong reason. Switch to **Strict** or **Permissive** when the code under test is intentionally case-insensitive or when you are comparing values that should be equal regardless of numeric type:

```tb
' Exact would fail because "hello" ≠ "Hello" (case differs)
Strict.AreEqual "HELLO", LCase$("HELLO")  ' fails -- "hello" ≠ "HELLO"
Permissive.AreEqual "HELLO", LCase$("HELLO")  ' passes -- case-insensitive
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
