---
title: Static Linking
parent: Advanced Features
nav_order: 3
---

# Static Linking of OBJ and LIB Files

tB allows you to use properly compiled .lib and .obj files as statically linked libraries, using declares similar to DLLs, only referring a lib/obj file in your Miscellaneous files folder of your project. Once the file is in the project, it's set up with this syntax outside of declares.

## Example

Example from the sqlite sample:

```vb
#If Win64 Then
    Import Library "/Miscellaneous/sqlite3_64.obj" As SQLITE3 Link "stdlib", "kernel32"
#Else
    Import Library "/Miscellaneous/sqlite3_32.obj" As SQLITE3 Link "stdlib", "kernel32"
#End If
```

### Generic Syntax

```
Import Libary "Relative resource path" As NAMESPACE Link "dependency1", "dependency2", '...
```

## Using Imported Libraries

After that, you can use NAMESPACE in place of a DLL name, inside class/module declares:

```vb
' Compiled sqlite-amalgamation-3440200 (v3.44.2)
'   using cmdline (MSVC):  cl /c /Gw /Gy /GS- /DSQLITE_OMIT_SEH sqlite3.c
#If Win64 Then
    Import Library "/Miscellaneous/sqlite3_64.obj" As SQLITE3 Link "stdlib", "kernel32"
#Else
    Import Library "/Miscellaneous/sqlite3_32.obj" As SQLITE3 Link "stdlib", "kernel32"
#End If

Module MainModule

    Declare PtrSafe Function sqlite3_open CDecl Lib SQLITE3 (ByVal filename As String, ByRef ppDb As LongPtr) As Long
    Declare PtrSafe Function sqlite3_exec CDecl Lib SQLITE3 (ByVal pDb As LongPtr, ByVal sql As String, ByVal exec_callback As LongPtr, ByVal udp As LongPtr, ByRef errmsg As LongPtr) As Long
'...
```

> [!NOTE]
> StdCall names will be mangled with argument sizes, e.g. `int myfunc(int x, short y);` would be `myfunc@6`. It therefore may be better to use `CDecl`.

A documentation page will be dedicated to more fully explaining this in the future; for now if you need help with it, visit the tB Discord or Discussions section of the GitHub repository and ask.
