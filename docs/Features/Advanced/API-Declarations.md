---
title: Enhanced API Declarations
parent: Advanced Features
nav_order: 4
permalink: /Features/Advanced/API-Declarations
---

# Enhancements to API and Method Declarations

twinBASIC provides several enhancements to API and method declarations to make working with external libraries easier.

## DeclareWide

The `DeclareWide` keyword, in place of `Declare`, disables ANSI<->Unicode conversion for API calls. This applies both directly to arguments, and to String arguments inside a UDT. For example, the following are equivalent in functionality:

```tb check_build
Public Declare PtrSafe Sub FooW Lib "some.dll" (ByVal bar As LongPtr)
Public DeclareWide PtrSafe Sub Foo Lib "some.dll" Alias "FooW" (ByVal bar As String)
```

Both represent a fully Unicode operation, but the allows direct use of the `String` datatype without requiring the use of `StrPtr` to prevent conversion.

> [!WARNING]
> This does **not** change the underlying data types-- the `String` type is a `BSTR`, not an `LPWSTR`, so in the event an API returns a pre-allocated `LPWSTR`, rather than filling a buffer you have created, it will not provide a valid `String` type. This would be the case where an API parameter is given as `[out] LPWSTR *arg`.

## Calling Conventions

An API declaration, a procedure, a delegate or an interface member can name its calling convention. The keyword goes directly after the name. Without one, the convention is stdcall, as in VBA.

| Keyword        | Convention | Arguments on win32                                  | Stack cleaned by |
|----------------|------------|-----------------------------------------------------|------------------|
| (none)         | stdcall    | all on the stack                                    | the callee       |
| **CDecl**      | cdecl      | all on the stack                                    | the caller       |
| **ThisCall**   | thiscall   | the first in the ECX register, the rest on the stack | the callee       |
| **FastCall**   | fastcall   | the first two in ECX and EDX, the rest on the stack  | the callee       |

The four follow the Microsoft C/C++ conventions of the same names: `__stdcall`, `__cdecl`, `__thiscall` and `__fastcall`. A declaration must name the convention its counterpart actually uses. A mismatch passes the arguments in the wrong places, leaves the stack unbalanced, and usually crashes.

A 64-bit build has only one calling convention. There, all four keywords are accepted and have no effect.

Name at most one convention. BETA 995 accepts two together without a diagnostic.

> [!NOTE]
> BETA 990 added **ThisCall** and **FastCall** in interface definitions, and BETA 992 everywhere else; earlier builds refuse them (TB5182).

### Examples

An API declaration, here with **DeclareWide**:

```tb check_build
Private DeclareWide PtrSafe Function _wtoi64 CDecl Lib "msvcrt" (ByVal psz As String) As LongLong
```

A `__fastcall` export. On a 32-bit build, `ntdll` exports `RtlUlongByteSwap` with the fastcall convention:

```tb check_build
Private Declare PtrSafe Function RtlUlongByteSwap FastCall Lib "ntdll" (ByVal Source As Long) As Long
```

A procedure exported from a standard DLL:

```tb check_build
[ DllExport ]
Public Function MyExportedFunction CDecl(value1 As Long, value2 As Long) As Long
    ' ...
End Function
```

### ThisCall in interfaces

Some C++ interfaces are not COM interfaces, and their methods use thiscall rather than stdcall. RichEdit's `ITextServices` and `ITextHost` are examples. Mark each such member **ThisCall** in the **Interface** definition:

```tb check_build projname=calling-conventions-thiscall
[InterfaceId("FF7DD8F0-0CCC-4197-86FB-A5591A6BA9B3")]
[OleAutomation(False)]
Interface ICounter Extends IUnknown
    Function Add ThisCall(ByVal Amount As Long) As Long
    Property Get Total ThisCall() As Long
End Interface
```

A class that implements the interface must repeat the convention on each member. An implementation without it, or with a convention the interface member does not have, is an error (TB5004, *Implemented interface member must use the same calling convention as the interface definition*).

```tb check_build projname=calling-conventions-thiscall
Class Counter
    Implements ICounter

    Private mTotal As Long

    Private Function ICounter_Add ThisCall(ByVal Amount As Long) As Long Implements ICounter.Add
        mTotal = mTotal + Amount
        Return mTotal
    End Function

    Private Property Get ICounter_Total ThisCall() As Long Implements ICounter.Total
        Return mTotal
    End Property
End Class
```

### Callbacks

A callback passed to an API must use the convention the API calls it with. Declare a [**Delegate**](../../tB/Core/Delegate) with that convention, use it as the parameter type, and give the target procedure the same keyword. [**AddressOf**](../../tB/Core/AddressOf) of a procedure with a different convention is accepted with a warning only (TB0026).

> [!NOTE]
> In BETA 995, on a 32-bit build, a call made from twinBASIC code *through* a **ThisCall** or **FastCall** delegate passes its arguments as stdcall does, and fails with *Bad DLL definition*. Calling the procedure directly works. **CDecl** delegates are not affected, and neither is a 64-bit build.

The following example performs a quicksort using the C runtime's [`qsort` function](https://learn.microsoft.com/en-us/cpp/c-runtime-library/reference/qsort), which calls its comparator with the cdecl convention:

```tb check_build
Private Delegate Function LongComparator CDecl ( _
    ByRef a As Long, _
    ByRef b As Long _
) As Long

Private Declare PtrSafe Sub qsort CDecl _
Lib "msvcrt" ( _
    ByRef pFirst As Any, _
    ByVal lNumber As Long, _
    ByVal lSize As Long, _
    ByVal pfnComparator As LongComparator _
)

Public Sub CallMe()
    Dim z() As Long
    Dim i As Long
    Dim s As String

    ReDim z(10) As Long
    For i = 0 To UBound(z)
        z(i) = Int(Rnd * 1000)
    Next i
    qsort z(0), UBound(z) + 1, LenB(z(0)), AddressOf Comparator
    For i = 0 To UBound(z)
        s = s & CStr(z(i)) & vbNewLine
    Next i
    MsgBox s
End Sub

Private Function Comparator CDecl( _
    ByRef a As Long, _
    ByRef b As Long _
) As Long
    Comparator = a - b
End Function
```

## Support for Passing User-Defined Types ByVal

Simple UDTs can be passed ByVal in APIs, interfaces, and any other method. In VB6 this requires workarounds such as passing each member separately.

```tb hidden
' Context for the two samples below: the Windows types they pass. A reader has
' these from a Windows declarations package such as WinDevLib; they are written
' out here so the declarations can be compiled. They sit at the top of the fence,
' not inside a Module block, so the batcher sees their names and keeps this page
' away from other pages that declare a POINT.
Public Type POINT
    x As Long
    y As Long
End Type

Public Enum BOOL
    CFALSE = 0
    CTRUE = 1
End Enum

Public Enum KeyStateMouse
    MK_LBUTTON = &H1
    MK_RBUTTON = &H2
    MK_SHIFT = &H4
    MK_CONTROL = &H8
    MK_MBUTTON = &H10
End Enum

Public Enum DROPEFFECTS
    DROPEFFECT_NONE = 0
    DROPEFFECT_COPY = 1
    DROPEFFECT_MOVE = 2
    DROPEFFECT_LINK = 4
End Enum
```

```tb hidden
' ...and the data-object interface that IDropTarget's methods take.
[InterfaceId("0000010E-0000-0000-C000-000000000046")]
Public Interface IDataObject Extends stdole.IUnknown
    Sub GetData()
End Interface
```

```tb check_build
Public Declare PtrSafe Function LBItemFromPt Lib "comctl32" (ByVal hLB As LongPtr, ByVal PXY As POINT, ByVal bAutoScroll As BOOL) As Long
```

```tb check_build
Interface IDropTarget Extends stdole.IUnknown
    Sub DragEnter(ByVal pDataObject As IDataObject, ByVal grfKeyState As KeyStateMouse, ByVal pt As POINT, pdwEffect As DROPEFFECTS)
    ' ...
End Interface
```

and so on. For this feature, a "simple" UDT is one that does not have members that are reference counted or are otherwise managed in the background, so may not contain interface, String, or Variant types. They may contain other UDTs.

## Variadic Arguments Support

With `cdecl` calling convention fully supported, twinBASIC can also handle variadic functions. In C/C++, those functions contain an ellipsis `...` as part of their arguments. This is represented in tB As `{ByRef | ByVal} ParamArray ... As Any()`. Note that `ByRef` or `ByVal` must be explicitly marked; implicit `ByRef` is not allowed.

### Example Using wsprintfW

Using the [given C/C++ prototype](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-wsprintfw):

```c
int WINAPIV wsprintfW(
  /* [out] */ LPWSTR  unnamedParam1,
  /* [in]  */ LPCWSTR unnamedParam2,
              /* ... */
);
```

The twinBASIC declaration and function using it can be written as shown:

```tb check_build
Private DeclareWide PtrSafe Function wsprintfW CDecl _
Lib "user32" ( _
  ByVal buf As String, _
  ByVal format As String, _
  ByVal ParamArray args As Any() _
) As Long

Private Sub Test()
  Dim buf As String = Space(1024)
  wsprintfW(buf, "%d %d %d", 1, 2, 3)
  MsgBox buf
End Sub
```

### va_list Arguments

For functions which contain the `va_list` type as part of their arguments the ParamArray declaration must be `ByRef`.

## PreserveSig

The `[PreserveSig]` attribute was described earlier for COM methods, but it can also be used on API declares. For APIs, the default is `True`. So therefore, you can specify `False` to rewrite the last parameter as a return.

### Example

```tb hidden
' Context for the samples below: the shell interface they return. A reader has
' this from the Windows shell type library; it is written out here so the two
' declarations can be compiled.
[InterfaceId("000214E6-0000-0000-C000-000000000046")]
Public Interface IShellFolder
    Sub ParseDisplayName()
End Interface
```

```tb check_build projname=preservesig-shell
Public Declare PtrSafe Function SHGetDesktopFolder Lib "shell32" (ppshf As IShellFolder) As Long
```

can be rewritten as:

```tb check_build projname=preservesig-shell2
[PreserveSig(False)]
Public Declare PtrSafe Function SHGetDesktopFolder Lib "shell32" () As IShellFolder
```
