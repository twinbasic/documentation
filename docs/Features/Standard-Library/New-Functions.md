---
title: New Functions
parent: Standard Library
nav_order: 3
---

# New Built-in Functions

In addition to the new datatype-related and component name functions already described, the standard builtin `VBA` library now includes many new capabilities.

## New Functions

- `IsArrayInitialized(variable)` - Determines if an array is initialized. Note: A `Variant` declared as empty array with `Array()` will return `True`.
- `RGBA(r, g, b, a)` - Like the `RBG()` function, only including the alpha channel.
- `RBG_R(rgba)`, `RGB_B(rgba)`, `RBG_G(rgba)`, and `RGBA_A(rgba)` - Get the values for individual channels.
- `TranslateColor(ColorValue, Optional Palette)` - Translates an OLE color value to an RGB color.
- `ProcessorArchitecture()` - Returns either `vbArchWin32` or `vbArchWin64`, depending on application bitness.
- `CallByDispId(Object, DispId, CallType, Arguments)` - Similar to `CallByName()`, but uses the dispatch id instead of method name.
- `RaiseEventByName(Object, Name, Args)` - Invokes an event on class, using arguments specified as a single `Variant` containing an array.
- `RaiseEventByName2(Object, Name, Arg1, Arg2, ...)` - Invokes an event on class, using arguments specified as a ParamArray.
- `PictureToByteArray(StdPicture)` - Converts a picture to a byte array; Global.LoadPicture supports loading from byte arrays.
- `CreateGUID()` - Returns a string with a freshly generated GUID.
- `AllocMem(size)` and `FreeMem` - allocate and free memory from the process heap.
- `Int3Breakpoint` - Inserts a true breakpoint helpful for attached external debuggers.
- `GetDeclaredTypeProgId(Of T)` / `GetDeclaredTypeClsid(Of T)` generics for getting strings of ProgID/CLSID.
- `GetDeclaredMinEnumValue(Of T)` / `GetDeclaredMaxEnumValue(Of T)` generics.
- Some `Interlocked*` functions

## Runtime Functions from msvbvm60.dll

tB has built in support for some of the most commonly used runtime functions, for compatibility. These all support both 32 and 64bit. Unless otherwise noted, all of these function in two ways: First, built in native versions that are always present (unless you remove the basic compiler packages), with the most common arrangements of arguments. These don't require a `Declare` statement. If you *do* provide a `Declare` version, tB will allow whatever arrangements of arguments you specify (e.g. `As Any` instead of `As LongPtr`), mapped to an alias if provided.

### Memory Functions

- `GetMem1`, `GetMem2`, `GetMem4`, `GetMem8`, `PutMem1`, `PutMem2`, `PutMem4`, `PutMem8`
- New additions `GetMemPtr` and `PutMemPtr` pegged to the current pointer size

### Object Manipulation

- `vbaObjSet`, `vbaObjSetAddref`, `vbaCastObj`, and `vbaObjAddref` for manipulating object assignments through pointers.

### Array Operations

- `vbaCopyBytes` and `vbaCopyBytesZero`
- `vbaAryMove` and `vbaRefVarAry` (currently only with a `Declare` statement).
- tB also has an instrinsic `VarPtr` but will still redirect calls via a declare statement, e.g. aliases used for arrays (though tB's `VarPtr` supports arrays natively).

## New App Object Properties

- `App.IsInIDE` - `True` when running from the IDE.
- `App.IsElevated` - Returns whether the program is currently running with administrator rights.
- `App.LastBuildPath` - Returns the full path of the last build. Does not persist between compiler/IDE restarts.
- `App.Build` - For the additional version number field.
- `App.ModulePath` - Returns the full path of the currently executing module. For example, if placed in a DLL and called from an EXE, the path of the DLL would be returned. Also, the twinBASIC debugger DLL is given when running from the IDE, when the method is in the app itself.

## COM Error Handling

### Direct Access to COM Errors

You can retrieve the last `HRESULT` to a COM interface call via `Err.LastHResult`; these are usually hidden and mapped to internal errors-- everything in a COM interface normally called a `Sub` is actually an `HRESULT`-returning function.

### Setting Return HRESULT

More importantly, you can now **set** the `HRESULT` in interface implementations with `Err.ReturnHResult`. This was a critical missing feature for which sometimes Err.Raise would work, but mostly programmers resorted to complicated vtable-swapping code to redirect to a standard module function. For instance you can now return `S_FALSE` where expected with `Err.ReturnHResult = S_FALSE`.

## Destructuring Assignment

This feature allows you to assign the contents of an array to multiple variables in a single line:

```vb
Dim a As Long, b As Long, c As Long
Dim d(2) As Long
d(0) = 1
d(1) = 2
d(2) = 3
Array(a, b, c) = d
Debug.Print a, b, c
```

This would print `1   2   3`. You could also assign multiple variables at once like this and get the same result:

```vb
Dim a As Long, b As Long, c As Long
Array(a, b, c) = Array(1, 2, 3)
Debug.Print a, b, c
```

You can now also do assignments like this:

```vb
Dim a As Long = 9
Dim b As Long = 7
Dim c() As Long = Array(a, b)
Debug.Print c(1), UBound(c)
```

Which prints `7    1`.

## Block and Inline Comments

You can now use `/* */` syntax. For example, `Sub Foo(bar As Long /* out */)` or:

```c
/*
Everything here is
a comment until:
*/
```
