---
title: Calling the Windows API
parent: Tutorials
permalink: /Tutorials/Windows-API
---

# Calling the Windows API
{: .no_toc }

This tutorial demonstrates an end-to-end Windows API call --- writing a `Declare` statement, calling the function, handling the result, and reading error information when things go wrong. By the end you will have a small form that tracks and displays the current mouse cursor position in real time.

- TOC
{:toc}

## Background

The Windows API is a large set of C functions exposed by system DLLs such as `user32.dll`, `kernel32.dll`, and `gdi32.dll`. VBA and twinBASIC can call these functions directly using a `Declare` statement, which maps an external function into the module's namespace with a typed signature.

The two things that matter most when writing a Declare:

1. **The correct type for every parameter.** A wrong type can pass the wrong number of bytes and corrupt the stack or heap.
2. **32-bit vs. 64-bit compatibility.** Many Win32 types are pointer-sized; they are 4 bytes in a 32-bit build and 8 bytes in a 64-bit build.

twinBASIC handles both concerns through **LongPtr** (a pointer-width integer) and the `PtrSafe` keyword (which signals that a Declare is safe to use in a 64-bit process).

## The example: tracking mouse coordinates

`GetCursorPos` reads the current screen coordinates of the mouse pointer and writes them into a caller-supplied `POINT` structure. It is a simple, safe function with no side effects --- a good starting point for learning the pattern.

The C prototype from the Windows SDK:

```c
BOOL GetCursorPos(LPPOINT lpPoint);
```

- Return value: non-zero on success, zero on failure.
- The single parameter is a pointer to a `POINT` structure that the function fills.

A twinBASIC translation:

```tb
Private Type POINT
    x As Long
    y As Long
End Type

Private Declare PtrSafe Function GetCursorPos Lib "user32" _
    (lpPoint As POINT) As Long
```

`POINT` contains two 32-bit integer fields. Even in a 64-bit build the fields themselves remain 32-bit --- only pointer values change width. `Long` is correct here.

The parameter `lpPoint As POINT` is passed **ByRef** by default. ByRef means twinBASIC passes the address of the local `POINT` variable to the function, which writes the coordinates back into it through that pointer. This is the standard Windows pattern for output parameters typed as `LP<Something>`.

## Step 1: Create the project and form

Create a new Standard EXE project (or open an existing one). On `Form1`, add:

| Control | Name | Caption | Notes |
|---------|------|---------|-------|
| Label | `lblCoords` | `(waiting...)` | Shows the current coordinates |
| Timer | `Timer1` | --- | Set **Interval** to `100` (ms), **Enabled** to `True` |

The Timer fires its `Timer` event every 100 milliseconds. Each firing will call `GetCursorPos` and update the label.

<!-- screenshot: Form1 with a large Label and a Timer control in the lower-left corner -->

## Step 2: Add the Declare and the UDT

Open the Code Editor for `Form1`. At the top of the module, before any procedures, add the UDT and the Declare:

```tb
Private Type POINT
    x As Long
    y As Long
End Type

Private Declare PtrSafe Function GetCursorPos Lib "user32" _
    (lpPoint As POINT) As Long
```

> [!NOTE]
> `PtrSafe` is required on any `Declare` that will be used in a 64-bit build. It tells the compiler that the signature has been reviewed for pointer-width correctness. Including `PtrSafe` on a 32-bit-only project has no effect, so it is good practice to use it everywhere.

## Step 3: Call the function and handle the result

Double-click the Timer control in the designer to generate the `Timer1_Timer` event handler, then fill it in:

```tb
Private Sub Timer1_Timer()
    Dim pt As POINT
    Dim success As Long

    success = GetCursorPos(pt)

    If success <> 0 Then
        lblCoords.Caption = "X: " & pt.x & "   Y: " & pt.y
    Else
        lblCoords.Caption = "(error)"
    End If
End Sub
```

`GetCursorPos` returns non-zero when it succeeds and zero when it fails. The `POINT` fields `x` and `y` are valid only when the return is non-zero.

## Step 4: Run the application

Press **F5**. Move the mouse over the form. The label updates ten times per second with the current screen coordinates (in pixels, measured from the top-left corner of the primary monitor).

## Error handling with GetLastError

When a Win32 function returns a failure code, the extended error information is available through `GetLastError` --- another kernel32 function:

```tb
Private Declare PtrSafe Function GetLastError Lib "kernel32" () As Long
```

> [!NOTE]
> In VBA-compatible code you can also read the last Win32 error through [**Err.LastDllError**](../tB/Modules/Information/Err), which is populated automatically after any DLL call. Both return the same value; `Err.LastDllError` does not require an extra Declare.

A robust version of the Timer handler:

```tb
Private Sub Timer1_Timer()
    Dim pt As POINT

    If GetCursorPos(pt) <> 0 Then
        lblCoords.Caption = "X: " & pt.x & "   Y: " & pt.y
    Else
        lblCoords.Caption = "GetCursorPos failed (error " & Err.LastDllError & ")"
    End If
End Sub
```

In practice `GetCursorPos` almost never fails; checking the return code matters for functions that deal with file handles, network connections, or security contexts where failure is routine.

## 32-bit vs. 64-bit considerations

For `GetCursorPos` the distinction does not arise because all its types are concrete 32-bit integers. Many other API functions use pointer-sized types that require care:

| C type | twinBASIC type | Why |
|--------|----------------|-----|
| `HWND`, `HANDLE` | **LongPtr** | Window and object handles are pointer-sized |
| `HINSTANCE`, `HMODULE` | **LongPtr** | Instance handles are pointer-sized |
| `LPCWSTR`, `LPWSTR` | **LongPtr** (with StrPtr) or **String** | String pointers are pointer-sized |
| `DWORD` | **Long** | Always 32-bit |
| `BOOL` | **Long** | Always 32-bit |
| `INT`, `int` | **Long** | Always 32-bit |

A Declare that uses `Long` for a handle type compiles and runs in 32-bit mode but fails or crashes in 64-bit mode because a 64-bit handle does not fit in 4 bytes. Always use `LongPtr` for handle and pointer parameters.

### Example: GetForegroundWindow

```tb
Private Declare PtrSafe Function GetForegroundWindow Lib "user32" () As LongPtr

Private Sub ShowActiveWindow()
    Dim hwnd As LongPtr
    hwnd = GetForegroundWindow()
    MsgBox "Active window handle: " & hwnd
End Sub
```

The return type is `LongPtr` because a window handle is pointer-sized. In a 32-bit build `LongPtr` is 4 bytes; in a 64-bit build it is 8 bytes. The same Declare and the same calling code work in both targets without any `#If Win64` conditional.

## ANSI vs. Unicode function variants

Most Win32 text-related functions come in two variants: an ANSI version (suffix `A`) that takes `LPSTR` / `char*` strings, and a Unicode version (suffix `W`) that takes `LPWSTR` / `wchar_t*` strings. twinBASIC strings are Unicode (`BSTR`), so always prefer the `W` variant.

Specify the Unicode function name in the `Alias` clause when the unaliased name would resolve to the ANSI variant:

```tb
' Without Alias, the linker resolves to the ANSI variant on some systems.
' Alias forces the Unicode variant explicitly:
Private Declare PtrSafe Function GetWindowText Lib "user32" _
    Alias "GetWindowTextW" _
    (ByVal hwnd As LongPtr, _
     ByVal lpString As Long, _
     ByVal nMaxCount As Long) As Long
```

For functions where twinBASIC can pass a **String** directly, `DeclareWide` is an alternative to manually managing the buffer pointer --- see [Features → Enhanced API Declarations](../Features/Advanced/API-Declarations) for the `DeclareWide` and `CDecl` extensions.

## Putting it together

The full module for the cursor-tracking form:

```tb
Private Type POINT
    x As Long
    y As Long
End Type

Private Declare PtrSafe Function GetCursorPos Lib "user32" _
    (lpPoint As POINT) As Long

Private Sub Form_Load()
    Me.Caption = "Cursor position"
    lblCoords.Caption = "(waiting...)"
    Timer1.Interval = 100
    Timer1.Enabled = True
End Sub

Private Sub Timer1_Timer()
    Dim pt As POINT

    If GetCursorPos(pt) <> 0 Then
        lblCoords.Caption = "X: " & pt.x & "   Y: " & pt.y
    Else
        lblCoords.Caption = "GetCursorPos failed (error " & Err.LastDllError & ")"
    End If
End Sub
```

## Where to go next

- **Enhanced API Declarations** -- `DeclareWide`, `CDecl`, `ByVal` UDTs, variadic arguments: [Features → Enhanced API Declarations](../Features/Advanced/API-Declarations)
- **Forms basics** -- the standard VB controls and event model: [Forms basics](Forms)
- **Unit testing** -- verifying functions that wrap API calls: [Writing unit tests with Assert](Testing-with-Assert)
