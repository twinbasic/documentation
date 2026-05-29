---
title: twinBASIC Additions
parent: Reference Section
nav_order: 11
has_toc: false
permalink: /Reference/twinBASIC-Additions
---

# twinBASIC Additions

twinBASIC extends the VBA language with new data types, language constructs, operators, runtime functions, and project-level capabilities. This page lists the additions that have a dedicated reference page, grouped by category.

For a broader overview aimed at developers coming from VBA or VB6, see the [welcome page](../).

---

## New data types

| Type | Description | Notes |
|------|-------------|-------|
| **LongLong** | 8-byte signed integer | Available in both 32-bit and 64-bit builds; VBA restricts it to 64-bit |
| **LongPtr** | Pointer-width signed integer | 4 bytes in 32-bit, 8 bytes in 64-bit; use in `Declare` statements |
| **Decimal** | 128-bit fixed-decimal type | Available as a standalone declared type, not only as a **Variant** subtype |

See [Data Types](Data-Types) for the full type table, and [Features → New Data Types](../Features/Language/Data-Types) for more detail on these three.

---

## New language constructs

### Object-oriented

- [**Interface**](../tB/Core/Interface) -- defines a COM interface using twinBASIC syntax; a class that **Implements** it must provide all members
- [**CoClass**](../tB/Core/CoClass) -- declares a COM co-class; generates COM registration metadata at compile time
- [**Inherits**](../tB/Core/Implements) -- makes one class inherit another's implementation (single inheritance only)
- [**Implements Via**](../tB/Core/Implements) -- an extended form of `Implements` that delegates interface dispatch to a member object instead of requiring per-member forwarding code
- [**Protected**](../tB/Core/Protected) -- declares a class member accessible to the class and its derived classes; VBA has no equivalent

### Generics

twinBASIC supports generic types and generic modules using the `Of` keyword. A generic class or module takes one or more type parameters at instantiation time --- for example, `EventLog(Of EventIds, Categories)` in the [WinEventLogLib](../tB/Packages/WinEventLogLib/EventLog) package, or `ServiceCreator(Of T)` in [WinServicesLib](../tB/Packages/WinServicesLib/ServiceCreator).

### New declaration keywords

- [**Delegate**](../tB/Core/Delegate) -- declares a typed function-pointer type; enables type-safe `AddressOf` and CDecl callbacks
- **Enum** member ranges -- enum members can now reference other members by name rather than only literal integers

### Flow control

- [**Continue**](../tB/Core/Continue) -- skips to the next iteration of the enclosing loop (`Continue For`, `Continue Do`, `Continue While`); VBA has no equivalent
- [**Return**](../tB/Core/Return) -- exits a **Function** or **Property Get** and supplies the return value in one statement; also retains the legacy **GoSub**/**Return** meaning

### Attributes

twinBASIC uses a square-bracket attribute syntax on declarations and modules:

```tb
[Documentation("Returns the absolute value of n.")]
[COMCreatable(False)]
Public Function Abs(ByVal n As Double) As Double
```

See [Attributes](../tB/Core/Attributes) for the full list, including `[DllExport]`, `[DebugOnly]`, `[WindowsControl]`, `[MustBeQualified]`, `[PreserveSig]`, and more.

### Inline initialisation

Variables can be initialised at the point of declaration:

```tb
Dim total As Long = 0
Dim greeting As String = "Hello"
Dim items() As String = Array("a", "b", "c")
```

See [Features → Inline Initialization](../Features/Language/Inline-Initialization).

### Parameterised New

`New` accepts constructor arguments when a class exposes an `_Initialize` method with matching parameters:

```tb
Dim conn As New NamedPipeClientConnection("\\.\pipe\mypipe", token)
```

See [Features → New](../Features/GUI-Components/New).

---

## New operators

| Operator | Description |
|----------|-------------|
| [**AndAlso**](../tB/Core/AndAlso) | Short-circuit logical AND --- the right operand is not evaluated if the left is `False` |
| [**OrElse**](../tB/Core/OrElse) | Short-circuit logical OR --- the right operand is not evaluated if the left is `True` |
| [**IsNot**](../tB/Core/IsNot) | Logical inverse of `Is`; `a IsNot b` is equivalent to `Not (a Is b)` |
| [**LeftShift**](../tB/Core/LeftShift) | Bitwise left shift; `x LeftShift n` shifts x left by n bits |
| [**RightShift**](../tB/Core/RightShift) | Bitwise right shift; `x RightShift n` shifts x right by n bits |

---

## New runtime functions

These functions exist in the VBA package but have no equivalent in standard VBA --- they are twinBASIC additions:

| Function | Module | Description |
|----------|--------|-------------|
| [**CType**](../tB/Modules/Conversion/CType) | Conversion | Explicit cast to a caller-supplied type; syntax `CType(expr, TypeName)` |
| [**If**](../tB/Modules/Interaction/If) | Interaction | Ternary --- evaluates to one of two values; only the chosen branch is evaluated |
| [**CallByDispId**](../tB/Modules/Interaction/CallByDispId) | Interaction | Invokes a method or property by its IDispatch dispatch ID |
| [**RaiseEventByName**](../tB/Modules/Interaction/RaiseEventByName) | Interaction | Raises an event by name, passing arguments as a **Variant** array |
| [**RaiseEventByName2**](../tB/Modules/Interaction/RaiseEventByName2) | Interaction | Raises an event by name with a variable-length argument list |
| [**ObjPtr**](../tB/Modules/Information/ObjPtr) | Information | Returns the COM-identity address of an object |
| [**VarPtr**](../tB/Modules/Information/VarPtr) | Information | Returns the address of a variable |
| [**StrPtr**](../tB/Modules/Information/StrPtr) | Information | Returns the address of a **String**'s underlying character buffer |
| [**IsArrayInitialized**](../tB/Modules/Information/IsArrayInitialized) | Information | Returns whether a dynamic array has been dimensioned |
| [**TranslateColor**](../tB/Modules/Information/TranslateColor) | Information | Translates an OLE colour to a plain RGB value |

Additional low-level memory, threading, and introspection functions are documented in the [HiddenModule](../tB/Modules/HiddenModule/) section.

---

## Project and runtime capabilities

### 64-bit compilation

twinBASIC compiles to either 32-bit or 64-bit native code. The target is set per-project. See [Features → 64-bit Compilation](../Features/64bit) and use `#If Win64 Then` / `#If Win32 Then` to conditionally compile architecture-specific code.

### Static linking (Fusion)

twinBASIC can statically link its runtime into the output EXE, producing a single-file distributable with no separate runtime DLL. See [Features → Fusion](../Features/Fusion).

### Multithreading

twinBASIC supports background threads through the `Thread` API. See [Features → Multithreading](../Features/Advanced/Multithreading).

### Inline assembly

The [**Emit**](../tB/Modules/HiddenModule/Emit) / [**EmitAny**](../tB/Modules/HiddenModule/EmitAny) functions inject raw byte sequences into the code generated for the enclosing procedure. The `[Naked]` attribute suppresses the generated prologue and epilogue. See [Features → Assembly](../Features/Advanced/Assembly).

### Enhanced API declarations

Beyond the standard `Declare`, twinBASIC adds:

- `DeclareWide` --- disables ANSI/Unicode conversion for string arguments
- `CDecl` calling convention on both declares and regular functions
- `ByVal` UDT passing
- Variadic (`CDecl` + `ParamArray ... As Any()`) parameter lists

See [Features → Enhanced API Declarations](../Features/Advanced/API-Declarations).

---

## IDE additions

- **CodeLens** --- inline action bars above procedures ("Run", "Debug", "Test") without leaving the editor. See [Features → CodeLens](../Features/Compiler-IDE/CodeLens).
- **Package server** (TWINSERV) --- install packages from a central registry without leaving the IDE. See [Features → Importing a package](../Features/Packages/Importing-TWINSERV).
- **Type inference** --- `Dim x = 1` infers **Long**; `For Each item In collection` infers the element type when the collection is typed. See [Features → Type Inference](../Features/Language/Type-Inference).
- **Conditional compilation constants** (`#Const`, `#If`) --- a superset of the VBA set; see [Compiler Constants](Compiler-Constants).

---

### See Also

- [Data Types](Data-Types) -- storage sizes and ranges for all intrinsic types
- [Features](../Features/) -- in-depth coverage of every twinBASIC feature
- [Categories](Categories) -- statements and procedures grouped by purpose
