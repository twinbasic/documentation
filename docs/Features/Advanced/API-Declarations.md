---
title: Enhanced API Declarations
parent: Advanced Features
nav_order: 4
---

# Enhancements to API and Method Declarations

twinBASIC provides several enhancements to API and method declarations to make working with external libraries easier.

## DeclareWide

The `DeclareWide` keyword, in place of `Declare`, disables ANSI<->Unicode conversion for API calls. This applies both directly to arguments, and to String arguments inside a UDT. For example, the following are equivalent in functionality:

```vb
Public Declare PtrSafe Sub FooW Lib "some.dll" (ByVal bar As LongPtr)
Public DeclareWide PtrSafe Sub Foo Lib "some.dll" Alias "FooW" (ByVal bar As String)
```

Both represent a fully Unicode operation, but the allows direct use of the `String` datatype without requiring the use of `StrPtr` to prevent conversion.

> [!WARNING]
> This does **not** change the underlying data types-- the `String` type is a `BSTR`, not an `LPWSTR`, so in the event an API returns a pre-allocated `LPWSTR`, rather than filling a buffer you have created, it will not provide a valid `String` type. This would be the case where an API parameter is given as `[out] LPWSTR *arg`.

## CDecl Support

The cdecl calling convention is supported both for API declares and methods in your code. This includes DLL exports in standard DLLs.

### Examples

```vb
Private DeclareWide PtrSafe Function _wtoi64 CDecl Lib "msvcrt" (ByVal psz As String) As LongLong`
```

```
[ DllExport ]
Public Function MyExportedFunction CDecl(foo As Long, Bar As Long) As Long
```

### CDecl Callbacks

Support for callbacks using `CDecl` is also available. You would pass a delegate that includes `CDecl` as the definition in the prototype. Here is an example code that performs a quicksort using the [`qsort` function](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-wsprintfw):

```vb
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

Simple UDTs can now be passed ByVal in APIs, interfaces, and any other method. In VBx this previously required workarounds like passing each argument separately.

```vb
Public Declare PtrSafe Function LBItemFromPt Lib "comctl32" (ByVal hLB As LongPtr, ByVal PXY As POINT, ByVal bAutoScroll As BOOL) As Long

Interface IDropTarget Extends stdole.IUnknown
    Sub DragEnter(ByVal pDataObject As IDataObject, ByVal grfKeyState As KeyStateMouse, ByVal pt As POINT, pdwEffect As DROPEFFECTS)
```

and so on. For this feature, a "simple" UDT is one that does not have members that are reference counted or are otherwise managed in the background, so may not contain interface, String, or Variant types. They may contain other UDTs.

## Variadic Arguments Support

With `cdecl` calling convention fully supported, twinBASIC can also handle variadic functions. In C/C++, those functions contain an ellipsis `...` as part of their arguments. This is represented in tB As `{ByRef | ByVal} ParamArray ... As Any()`. Note that `ByRef` or `ByVal` must be explicitly marked; implicit `ByRef` is not allowed.

### Example Using wsprintfW

Using the [given C/C++ prototype](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-wsprintfw):

```cpp
int WINAPIV wsprintfW(
  [out] LPWSTR  unnamedParam1,
  [in]  LPCWSTR unnamedParam2,
        ...
);
```

The twinBASIC declaration and function using it can be written as shown:

```vb
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

The `[PreserveSig]` attribute was described earlier for COM methods, but it can also be used on API declares. For APIs, the default is `True`. So therefore, you can specify `False` in order to rewrite the last parameter as a return.

### Example

```vb
Public Declare PtrSafe Function SHGetDesktopFolder Lib "shell32" (ppshf As IShellFolder) As Long
```

can be rewritten as:

```vb
[PreserveSig(False)]
Public Declare PtrSafe Function SHGetDesktopFolder Lib "shell32" () As IShellFolder`
```
