---
title: Compiler Warnings
parent: Compiler and IDE Features
nav_order: 1
permalink: /Features/Compiler-IDE/Compiler-Warnings
---

# Compiler Warnings

twinBASIC reports a warning, as the code is written, for a common bad practice or a likely oversight: code that compiles, but probably does not do what was meant, or uses a feature kept only for compatibility with VBA and VB6. Each warning has a code from TB0001 to TB0037, and the [Diagnostics](../../tB/IDE/Code/Diagnostics) panel lists them with the line they are on.

## Adjusting Warnings

Each warning has a level: **WARNING**, **HINT**, **INFO**, **IGNORE** or **ERROR**. A warning at **IGNORE** is not reported, and one at **ERROR** is reported as an error, so the project does not build. In a new project the Compiler Warnings list of Project Settings shows TB0015, TB0030 and TB0034 at **HINT**, TB0018 to TB0021, TB0024, TB0025 and TB0029 at **IGNORE**, and every other warning at **WARNING**. The compiler reports TB0029, TB0034 and TB0035 at other levels: see [TB0029](#tb0029-missing-ptrsafe), [TB0034](#tb0034-legacy-dll-redirected) and [TB0035](#tb0035-late-bound-conversion).

The levels for the whole project are in the **Compiler Warnings** group of [Project Settings](../../tB/IDE/Project-Settings#compiler-warnings). Each row of its list has a drop-down for the level, then the code and the text of the warning. The **Filter warnings...** box above the list narrows it to the rows whose code or text holds the words typed:

![The Compiler Warnings list of the Project Settings dialog, showing warnings TB0001 to TB0016. Each row has a drop-down at its left, set to WARNING except for TB0015, which is set to HINT, then the bold code and the text of the warning](../Images/017bd6f8-4b35-43a9-b6be-84cba69daf64.png){:width="979" height="584"}

Three attributes change the level in one class, module or procedure: [**IgnoreWarnings**](../../tB/Core/Attributes#ignorewarnings) turns the named warnings off, [**EnforceWarnings**](../../tB/Core/Attributes#enforcewarnings) reports them as warnings, also one that is at **IGNORE** in the project, and [**EnforceErrors**](../../tB/Core/Attributes#enforceerrors) reports them as errors. Each takes one or more codes, written in full with the leading zeroes and not quoted:

```tb check_build
[IgnoreWarnings(TB0001)]
Module LegacyMath
    DefLng A-Z
End Module
```

## Strict Mode

Four warnings report implicit conversions that VBA makes silently, in the way .NET's **Option Strict** does: [TB0018](#tb0018-implicit-narrowing-conversion), [TB0019](#tb0019-implicit-enumeration-conversion), [TB0020](#tb0020-suspicious-interface-conversion) and [TB0021](#tb0021-implicit-enumeration-conversion-tofrom-numeric). They are at **IGNORE** by default. Set them to **WARNING** or **ERROR** in Project Settings, or name them in an **EnforceWarnings** or **EnforceErrors** attribute, to have the compiler insist that each such conversion is written out. Each can be turned on or off on its own.

## The Warnings

### TB0001: Use of Legacy DefType
{: index="TB0001" }

A [**Def**_type_](../../tB/Core/Deftype) statement, such as **DefLng**, sets the type of every variable whose name starts with one of its letters. The type of a variable then depends on its name rather than on its declaration, which makes the code hard to read and its errors hard to find.

```tb check_build slot=module
DefLng A-Z

Function Twice(n)
    Twice = n * 2
End Function
```

### TB0002: Compiler-Generated Variable
{: index="TB0002" }

In a file with [**Option Explicit Off**](../../tB/Core/Option), a name that has not been declared is declared by the compiler, as a **Variant**. Each such variable draws TB0002, *This variable has been auto-declared by the compiler due to Option Explicit being OFF*, so a misspelt name does not go unnoticed.

```tb check_build slot=file
Option Explicit Off

Module Tally
    Sub Count()
        hits = hits + 1
        Debug.Print hits
    End Sub
End Module
```

### TB0003: Implicit Variant Data Type
{: index="TB0003" }

A variable, parameter or function declared without **As** _type_ is a **Variant**. TB0003, *Datatype has not been explicitly declared so will default to Variant*, says so. Write `As Variant` where a **Variant** is meant.

```tb check_build
Dim total
total = 1
Debug.Print total
```

### TB0004: Wrong Exit Statement
{: index="TB0004" }

**Exit Function** or **Exit Sub** inside a **Property Get** procedure leaves the property, as VBA allows, but the statement that belongs there is [**Exit Property**](../../tB/Core/Exit).

```tb check_build slot=module
Private m_Count As Long

Public Property Get Count() As Long
    If m_Count < 0 Then Exit Function
    Count = m_Count
End Property
```

### TB0005: Warning Directive
{: index="TB0005" }

A `#Warning` directive reports its text as warning TB0005, as a reminder in the code.

```tb check_build
#Warning "Remove this before the release build"
Debug.Print "testing"
```

<!-- test: bug warning-directive-text-cut -->
> [!NOTE] BETA 1034
> The text of a `#Warning` or `#Error` directive stops at its first `|`: `#Warning "before|after"` reports only `"before`.

### TB0006: Record Length Is Ignored in Binary Mode
{: index="TB0006" }

A file opened **For Binary** is read and written byte by byte, so the **Len** clause of its [**Open**](../../tB/Core/Open) statement has no effect.

```tb check_build
Dim f As Integer
f = FreeFile
Open "data.bin" For Binary As #f Len = 512
Close #f
```

### TB0007: Mismatched Data Type Hint
{: index="TB0007" }

A type-declaration character on a name that is declared as a different type, such as `count$` for a **Long**.

```tb check_build
Dim count As Long
count = 5
Debug.Print count$
```

### TB0008: Suspicious Call
{: index="TB0008" }

A call to a class's own **Class_Initialize** event procedure, *Suspicious call to event Class_Initialize*. The class's initialization runs again on an object that already exists. Move the code into a procedure that **Class_Initialize** and the other caller both call.

```tb check_build slot=class
Private m_Items As Collection

Private Sub Class_Initialize()
    Set m_Items = New Collection
End Sub

Public Sub Clear()
    Class_Initialize
End Sub
```

### TB0009: Unimplemented
{: index="TB0009" }

A call to a procedure marked [**Unimplemented**](../../tB/Core/Attributes#unimplemented), *[ExportToPdf] has not yet been implemented*. The warning is at the call, not at the procedure. Some members of the built-in packages that twinBASIC does not implement yet are marked this way.

```tb check_build slot=module
[Unimplemented]
Public Sub ExportToPdf()
End Sub

Public Sub SaveReport()
    ExportToPdf
End Sub
```

### TB0010: Duplicate DLL Declaration
{: index="TB0010" }

Reports a DLL entry point that is declared more than once: *Duplicate declaration of DLL entry point*.

### TB0011: Use of Legacy Date/Time Property Let
{: index="TB0011" }

Reports an assignment to the legacy date and time properties, such as the [**Date**](../../tB/Modules/DateTime/Date) statement, which sets the system date: *Use of legacy date/time property-let assignments are strongly discouraged*.

### TB0012: Possible Hex Literal Misuse
{: index="TB0012" }

A hexadecimal literal without a type character takes the smallest type it fits in. So `&H8000` is the **Integer** -32,768, and stored in a **Long** it stays -32,768 rather than becoming the positive 32,768 that was most likely meant, which needs `&H8000&`. TB0012 reports a literal from `&H8000` to `&HFFFF` converted to a **Long** or **LongLong**, and one from `&H80000000` to `&HFFFFFFFF`, a **Long**, converted to a **LongLong**. Its message names the literal to write instead: `&H8000&` for a **Long**, `&H80000000^` for a **LongLong**.

```tb check_build check_run
Dim mask As Long
mask = &H8000
Debug.Print mask        ' -32768
mask = &H8000&
Debug.Print mask        ' 32768
```

### TB0013: Missing InterfaceId Attribute
{: index="TB0013" }

A class marked [**COMControl**](../../tB/Core/Attributes#comcontrol) without an [**InterfaceId**](../../tB/Core/Attributes#interfaceid) attribute, and again without an [**EventInterfaceId**](../../tB/Core/Attributes#eventinterfaceid) attribute. A host may cache the identifiers of a control's interfaces, so they should be fixed in the source rather than made anew by each build.

```tb check_build slot=file
[COMControl]
Class Gauge
End Class
```

### TB0014: Inline ByVal on a UDT
{: index="TB0014" }

**ByVal** written in front of a user-defined type in a call to a [**Declare**](../../tB/Core/Declare) procedure has no effect. The structure is passed by reference all the same, and its strings are not converted to ANSI, as in VBA and VB6.

```tb check_build slot=module
Private Type CursorPoint
    X As Long
    Y As Long
End Type

Private Declare PtrSafe Function GetCursorPos Lib "user32" (ByRef lpPoint As Any) As Long

Public Sub ShowCursor()
    Dim pt As CursorPoint
    GetCursorPos ByVal pt
    Debug.Print pt.X, pt.Y
End Sub
```

### TB0015: Declare Redirected to twinBASIC
{: index="TB0015" }

A **Declare** of a function that twinBASIC implements itself, such as `GetMem4` from `msvbvm60.dll`: *This Declare statement has been redirected to an internal twinBASIC implementation, supporting both 32-bit and 64-bit*. The call runs twinBASIC's own code, not the DLL's, in a 32-bit and a 64-bit build alike. The [FAQ](../../FAQ#when-it-does-not-work) lists the functions. It is at **HINT** by default.

```tb check_build slot=module
Private Declare PtrSafe Sub GetMem4 Lib "msvbvm60" (ByVal Src As LongPtr, ByVal Dst As LongPtr)
```

A **Declare** of a function from a legacy DLL that twinBASIC calls in another DLL instead is [TB0034](#tb0034-legacy-dll-redirected).

### TB0016: Implicit ReDim Variable
{: index="TB0016" }

[**ReDim**](../../tB/Core/ReDim) of a name that has not been declared declares the array, as VBA allows. Declare it first, with **Dim** and empty parentheses.

```tb check_build
ReDim scores(1 To 10) As Long
scores(1) = 95
```

### TB0017: Inexact Array Alias Argument
{: index="TB0017" }

Reports an array passed to an array parameter whose element type is a different alias of the same type, which twinBASIC accepts for compatibility with VBA and VB6: *array argument does not precisely match the expected type as the alias subtypes are different, but this is allowed for VBx compatibility*.

### TB0018: Implicit Narrowing Conversion
{: index="TB0018" }

A value converted to a smaller type without a conversion function, such as a **Long** assigned to an **Integer**. The conversion raises an overflow error when the value does not fit. The message names the function to use, here [**CInt**](../../tB/Modules/Conversion/CInt). An enumeration value assigned to an **Integer** or a **Byte** draws it too. It is at **IGNORE** by default.

```tb check_build slot=module
[EnforceWarnings(TB0018)]
Public Sub Narrow()
    Dim i As Integer, l As Long
    l = 1000
    i = l             ' TB0018
    i = CInt(l)       ' no warning
End Sub
```

### TB0019: Implicit Enumeration Conversion
{: index="TB0019" }

A value of one enumeration assigned to a variable of another, or a **Double**, **Single**, **Currency** or **Variant** assigned to a variable of an enumeration. [**CType(Of** _type_**)**](../../tB/Modules/Conversion/CType) makes the conversion explicit. It is at **IGNORE** by default.

```tb check_build slot=module
[EnforceWarnings(TB0019)]
Public Sub Convert()
    Dim answer As VbMsgBoxResult, day As VbDayOfWeek
    answer = vbYes
    day = answer                             ' TB0019
    day = CType(Of VbDayOfWeek)(answer)      ' no warning
End Sub
```

<!-- test: sample tb0019-other-enum-constant, sample tb0019-enforced -->
> [!NOTE] BETA 1034
> A member of another enumeration, written as a constant (`day = vbOK`), converts without a warning.

```tb probe id=tb0019-enforced slot=module expect-error=TB0019
[EnforceErrors(TB0019)]
Public Sub ProbeOtherEnumVariable()
    Dim answer As VbMsgBoxResult, day As VbDayOfWeek
    answer = vbYes
    day = answer
End Sub
```

```tb probe id=tb0019-other-enum-constant slot=module
[EnforceErrors(TB0018, TB0019, TB0021)]
Public Sub ProbeOtherEnumConstant()
    Dim day As VbDayOfWeek
    day = vbOK
End Sub
```

### TB0020: Suspicious Interface Conversion
{: index="TB0020" }

An object assigned to a variable of an interface or class that its type is not declared to support, *suspicious conversion from type StdPicture to type Font*. The assignment asks the object for that interface at run time, and fails if it does not have it. **CType(Of** _type_**)** makes the conversion explicit. It is at **IGNORE** by default.

```tb check_build slot=module
[EnforceWarnings(TB0020)]
Public Sub Assign()
    Dim myPic As StdPicture
    Dim myFont As StdFont
    Set myFont = myPic                       ' TB0020
    Set myFont = CType(Of StdFont)(myPic)    ' no warning
End Sub
```

### TB0021: Implicit Enumeration Conversion to/from Numeric
{: index="TB0021" }

Reports an implicit conversion between an enumeration and a numeric type. It is at **IGNORE** by default.

<!-- test: sample tb0021-not-drawn, sample tb0021-whole-number-and-long, sample tb0019-from-double, sample tb0018-to-integer -->
> [!NOTE] BETA 1034
> None of these conversions draws TB0021. A whole number assigned to a variable of an enumeration, or an enumeration value assigned to a **Long**, converts without a warning. A **Double**, **Single**, **Currency** or **Variant** assigned to a variable of an enumeration draws [TB0019](#tb0019-implicit-enumeration-conversion), and an enumeration value assigned to an **Integer**, **Byte** or **Single** draws [TB0018](#tb0018-implicit-narrowing-conversion).

```tb probe id=tb0021-not-drawn slot=module
[EnforceErrors(TB0021)]
Public Sub ProbeNoTB0021()
    Dim day As VbDayOfWeek, l As Long, i As Integer, b As Byte
    Dim d As Double, s As Single, c As Currency, v As Variant
    day = 3
    l = day
    d = 2: s = 2: c = 2: v = 2
    day = d
    day = s
    day = c
    day = v
    i = day
    b = day
    s = day
End Sub
```

```tb probe id=tb0021-whole-number-and-long slot=module
[EnforceErrors(TB0018, TB0019, TB0021)]
Public Sub ProbeWholeNumberAndLong()
    Dim day As VbDayOfWeek, l As Long
    day = 3
    l = day
End Sub
```

```tb probe id=tb0019-from-double slot=module expect-error=TB0019
[EnforceErrors(TB0019)]
Public Sub ProbeDoubleToEnum()
    Dim day As VbDayOfWeek, d As Double
    d = 2
    day = d
End Sub
```

```tb probe id=tb0018-to-integer slot=module expect-error=TB0018
[EnforceErrors(TB0018)]
Public Sub ProbeEnumToInteger()
    Dim day As VbDayOfWeek, i As Integer
    day = vbMonday
    i = day
End Sub
```

### TB0022: Suspicious Assignment
{: index="TB0022" }

An array assigned to an array of another element type, *suspicious array assignment; subtypes do not match*.

<!-- test: bug language-pack-semicolon-cut -->
> [!NOTE] BETA 1034
> The message reads only *Suspicious array assignment*: the IDE cuts the text that `en-gb.lang` gives it at its semicolon. See [Language packs](../../tB/IDE/Customising/#language-packs).

```tb check_build
Dim counts() As Long
Dim small() As Integer
ReDim small(3)
counts = small
```

### TB0023: Unusual Use of an Implicit Implements Field
{: index="TB0023" }

In a class, [**Implements**](../../tB/Core/Implements) _name_ also declares a field called _name_, which is **Nothing**. Code that uses the field draws TB0023, *Unusual use of implicit field generated from an Implements statement*. To refer to the object as that interface, use **Me**.

```tb check_build slot=file
Interface IPrintable
    Sub PrintOut()
End Interface

Class Invoice
    Implements IPrintable

    Private Sub IPrintable_PrintOut() Implements IPrintable.PrintOut
    End Sub

    Public Function AsPrintable() As IPrintable
        Set AsPrintable = IPrintable     ' TB0023: the field is Nothing
    End Function
End Class
```

### TB0024: Unused Variable
{: index="TB0024" }

A local variable that is declared but never used, *Unused local variable 'unused'*. It is at **IGNORE** by default.

```tb check_build slot=module
[EnforceWarnings(TB0024)]
Public Sub Report()
    Dim total As Long
    Dim unused As String
    total = 1
    Debug.Print total
End Sub
```

### TB0025: Unused Parameter
{: index="TB0025" }

A parameter that the procedure never uses, *Unused procedure parameter 'title'*. It is at **IGNORE** by default.

```tb check_build slot=module
[EnforceWarnings(TB0025)]
Public Sub Greet(name As String, title As String)
    Debug.Print "Hello, " & name
End Sub
```

### TB0026: Mismatched Delegate Types
{: index="TB0026" }

[**AddressOf**](../../tB/Core/AddressOf) of a procedure whose parameters or return type do not match the [**Delegate**](../../tB/Core/Delegate) type it is assigned or passed to. The program still builds, and the procedure then receives its arguments in a form it does not expect. **CType(Of** _type_**)** makes the conversion explicit, and `[EnforceErrors(TB0026)]` makes the mismatch an error. See [Delegates](../Language/Delegates).

```tb check_build slot=module
Private Delegate Function LongTransform(ByVal x As Long) As Long

Private Function Half(ByVal x As Integer) As Long
    Return x \ 2
End Function

Public Sub UseIt()
    Dim t As LongTransform = AddressOf Half     ' TB0026
    Debug.Print t(10)
End Sub
```

### TB0027: Return Without GoSub
{: index="TB0027" }

Reports a [**Return**](../../tB/Core/GoSub-Return) that is not preceded by a **GoSub**.

### TB0028: Control Overshadowed
{: index="TB0028" }

Reports a control on a form that has the name of a method or property of the form: *control [name] is overshadowed by base form method or property of the same name*.

### TB0029: Missing PtrSafe
{: index="TB0029" }

A **Declare** statement without **PtrSafe**, which 64-bit VBA 7 requires, *Declare needs PtrSafe attribute on this build configuration for VBA7 compatibility*. It is reported only in a 64-bit build. The Compiler Warnings list shows it at **IGNORE** by default.

<!-- test: bug tb0029-level-ignored -->
> [!NOTE] BETA 1034
> TB0029 is reported as a warning whatever its level: at **IGNORE**, **HINT**, **INFO** or **ERROR** in the Compiler Warnings list, and under **IgnoreWarnings** or **EnforceErrors** on a module or on the **Declare**. Adding **PtrSafe** to the **Declare** removes it.

```tb check_build slot=file
[EnforceWarnings(TB0029)]
Module Win32Calls
    Private Declare Function GetTickCount Lib "kernel32" () As Long
End Module
```

### TB0030: Declare Alias Not Needed
{: index="TB0030" }

An **Alias** clause on a **Declare** statement that names the same entry point as the procedure's own name. It is at **HINT** by default.

```tb check_build slot=module
Private Declare PtrSafe Function GetTickCount Lib "kernel32" Alias "GetTickCount" () As Long
```

### TB0031: Suspicious Use of Erase
{: index="TB0031" }

[**Erase**](../../tB/Core/Erase) of the array a function returns. The function returns a copy of its array, which is freed on its own, so the statement erases nothing that remains.

```tb check_build slot=module
Private Function Squares() As Long()
    Dim r(3) As Long
    Return r
End Function

Public Sub Clear()
    Erase Squares()
End Sub
```

### TB0032: Unused Line Label
{: index="TB0032" }

A line label that no **GoTo**, **GoSub**, **On Error** or **Resume** statement names, *Line label is not used*.

```tb check_build
Dim i As Long
Retry:
i = i + 1
Debug.Print i
```

### TB0033: Duplicate Definition
{: index="TB0033; TB5134" }

Reports a duplicate definition as a warning: *Duplicate definition, consider changing the name to be unique*. A name declared twice in one module, procedure, **Enum** or **Type** is error TB5134 instead.

### TB0034: Legacy DLL Redirected
{: index="TB0034" }

A **Declare** of a function from a legacy system DLL that twinBASIC calls in its modern replacement instead, such as `OleCreatePictureIndirect`, which `olepro32.dll` exported and `oleaut32.dll` now does: *Use of legacy DLL OLEPRO32.DLL has been redirected to OLEAUT32.DLL*. Up to BETA 1033 the compiler reported it as [TB0015](#tb0015-declare-redirected-to-twinbasic). The Compiler Warnings list shows it at **HINT** by default.

<!-- test: bug tb0034-level-ignored, bug warning-message-names-blank -->
> [!NOTE] BETA 1034
> TB0034 is reported as a warning whatever its level: at **IGNORE**, **HINT** or **ERROR** in the Compiler Warnings list, and under **IgnoreWarnings** or **EnforceErrors**. Its message leaves out the two names: *Use of legacy DLL has been redirected to*.

```tb check_build slot=module
Private Declare PtrSafe Function OleCreatePictureIndirect Lib "olepro32" ( _
    ByRef PicDesc As Any, ByRef RefIID As Any, _
    ByVal fPictureOwnsHandle As Long, ByRef IPic As Any) As Long
```

### TB0035: Late-Bound Conversion
{: index="TB0035" }

A value whose type is known only at run time, an **Object** or a **Variant**, assigned or passed to a variable or parameter of a class or interface type: *Conversion from type Variant to type Font might fail at runtime. Use CType(Of Font)(expression) to avoid this message*. An item of a **Collection** is a **Variant**, and the result of a function declared **As Object** is an **Object**. When the value is not an object of that type, the conversion raises an error at run time, such as error 424, *Object required*, for a string. **CType(Of** _type_**)** makes the conversion explicit. A conversion from a known type that is not declared to support the target is [TB0020](#tb0020-suspicious-interface-conversion) instead. The Compiler Warnings list shows TB0035 at **WARNING** by default.

<!-- test: bug tb0035-default-not-reported, bug warning-message-names-blank -->
> [!NOTE] BETA 1034
> In a project whose settings give TB0035 no level, as a new project's do, TB0035 is not reported, although the Compiler Warnings list shows it at **WARNING**. Name it in an **EnforceWarnings** attribute, as below, to have it reported. For a conversion from an **Object**, its message shows `{0}`, `{1}` and `{2}` in place of the two types and the conversion.

```tb check_build slot=module
[EnforceWarnings(TB0035)]
Public Sub UseFirst(ByVal fonts As Collection)
    Dim f As StdFont
    Set f = fonts(1)                         ' TB0035
    Set f = CType(Of StdFont)(fonts(1))      ' no warning
End Sub
```

### TB0036: Assignment to an Object With No Default Property
{: index="TB0036" }

An assignment without **Set** to a variable of a class that has no default property to take the value, *Assignment to class that does not seem to offer a default property-put member*. At run time the assignment raises error 438, *Object doesn't support this property or method*. Assign to one of the object's properties, or use **Set** to assign another object.

```tb check_build slot=file
Class Counter
    Public Total As Long
End Class

Module Usage
    Public Sub Reset()
        Dim c As New Counter
        c = 0               ' TB0036: Counter has no default property
        c.Total = 0         ' no warning
    End Sub
End Module
```

### TB0037: Implicit Conversion to a Delegate Type
{: index="TB0037" }

A value that is not a delegate, such as a **LongPtr** that holds a procedure's address, a **Long** or a **Variant**, assigned or passed to a [**Delegate**](../../tB/Core/Delegate) type: *Implicit conversion to delegate type. Use CType(Of ) to explicitly convert the delegate to a different type*. The compiler cannot check that the value is the address of a procedure that matches the delegate. [**AddressOf**](../../tB/Core/AddressOf) of a procedure assigns without this warning, and [TB0026](#tb0026-mismatched-delegate-types) checks the procedure instead. **CType(Of** _type_**)** makes the conversion explicit.

```tb check_build slot=module
Private Delegate Function LongTransform(ByVal x As Long) As Long

Private Function Quarter(ByVal x As Long) As Long
    Return x \ 4
End Function

Public Sub UseIt()
    Dim p As LongPtr = AddressOf Quarter
    Dim t As LongTransform = p                             ' TB0037
    Dim u As LongTransform = CType(Of LongTransform)(p)    ' no warning
    Debug.Print t(10), u(10)
End Sub
```

<!-- BETA 1007 (tbbuild, every warning set to WARNING in project.warnings): none of
     these drew TB0010, TB0011, TB0017, TB0021, TB0027, TB0028 or TB0033.
     BETA 1010 (tbbuild, [EnforceWarnings] in a project with no project.warnings):
     the four NOTEs hold: TB0015 is a WARNING; `day = vbOK` draws nothing and
     `day = answer` TB0019; TB0021 is not drawn by Integer, Byte, Long or a literal
     to an Enum, an Enum to Long, ByRef Long or Enum arguments; Double, Single,
     Currency and Variant to an Enum draw TB0019 and TB0018, an Enum to Integer,
     Byte or Single TB0018; ide/main.js lists the Duplicate definition row as TB0032.
     TB0010: two Declares of one entry point under two names in one module (same and
       different signatures, Declare and DeclareWide, "kernel32" and "kernel32.dll"),
       one name in two modules, a Declare in a Class and a Module.
     TB0011: Date = , Time = , Date$ = , Time$ = , VBA.Date = , DateTime.Time = ,
       with a Date and with a String.
     TB0017: an array of one Alias type, or of an Enum, passed to a Long() parameter
       and the reverse; two Alias types of Long; Collection() to Object(); LongPtr()
       to Long() (win64: TB5001).
     TB0021: Integer, Byte, Long and a literal to an Enum variable; an Enum to Long;
       ByRef Long and Enum arguments. Double, Single, Currency, Variant give TB0019.
     TB0027: Return in a Sub with no GoSub, before a GoSub, after a label.
     TB0028: TextBoxes named Caption, Refresh, Hide, Width, Left, Controls, Font,
       Visible, hWnd and Name on a form, used and unused in its code.
     TB0033: a code-behind field named as a control; members of a derived class
       named as its base's; module/procedure duplicates give TB5134.
     TB0015 is a WARNING, TB0030 a HINT, in a project whose project.warnings lists
     are empty (the console template, as in a new IDE project).
     The compiler's message texts quoted above are from twinBASIC_win32.dll and
     twinBASIC_win64.dll; TB0029's message is in the win64 one only.
     BETA 1034 (tbbuild, a project with empty project.warnings lists, as the Standard
     EXE and ActiveX DLL templates have, then [EnforceWarnings]; BETA 1033 the control):
     the messages of TB0001 to TB0037 are in locale/en-gb.lang; the IDE's list
     (ide/main.js warningsTable) has TB0034 to TB0037 and gives TB0033 its own id, and
     its Project Settings code sets TB0015, TB0030 and TB0034 to HINT.
     TB0015: a Declare of msvbvm60's GetMem4 is a HINT, and follows IGNORE and ERROR.
       BETA 1033 reported it as TB0015 too, and the olepro32 Declare as TB0015, a WARNING.
     TB0029: a Declare with no PtrSafe, win64: a WARNING with no level, at IGNORE, HINT,
       INFO, ERROR and WARNING, and under IgnoreWarnings, EnforceErrors and EnforceWarnings
       on the Module or the Declare, where TB0030 takes each level; the same on BETA 1033
       and 1010 (bugs/tb0029-level-ignored).
     TB0034: the olepro32 Declare, a WARNING at IGNORE, HINT and ERROR and under
       IgnoreWarnings and EnforceErrors, win32 and win64 (bugs/tb0034-level-ignored);
       the message's {0} and {1} are empty (bugs/warning-message-names-blank).
     TB0035: not reported with no level (bugs/tb0035-default-not-reported); reported
       when named in project.warnings.warnings or EnforceWarnings. Drawn by an Object
       or a Variant to StdFont, a project class or interface, Set and Dim ... =, a
       function As Object, an Object argument, a Collection item, o.Font late bound;
       {0} {1} {2} left for every Object source. StdFont to StdPicture, IUnknown to
       StdFont, class to interface and back are TB0020. Run time: a String item to
       StdFont raises 424.
     TB0036: c = 3 on a class with no default member (BETA 1033: TB0022); StdFont,
       whose default is Name, draws nothing; a Collection draws TB5092 Missing
       argument 'Index'. Run time: 438.
     TB0037: a LongPtr, a Long or a Variant to a delegate, by Dim ... = and as an
       argument (BETA 1033: TB0026); AddressOf and CType(Of) draw nothing; the
       delegate made from a LongPtr calls the procedure. TB0022's and TB0026's
       samples still draw TB0022 and TB0026. TB0022's message in BETA 1034 is cut at
       its "; " by the IDE's language-pack reader: "Suspicious array assignment"
       (bugs/language-pack-semicolon-cut, asserted by the language lane). -->
