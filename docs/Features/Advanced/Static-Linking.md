---
title: Static Linking
parent: Advanced Features
nav_order: 3
permalink: /Features/Advanced/Static-Linking
index: static library
---

# Static Linking of OBJ and LIB Files

Links compiled C code from `.obj`, `.lib` and `.a` files into the program, which calls its functions through **Declare** statements and needs no DLL beside it.

<!-- test: none -- the page's experiments with MSVC-compiled objects are not kept in the repository: check What can be linked again -->
> [!NOTE] BETA 1034
> Static linking is experimental. It links code that needs nothing from the C runtime library beyond the few functions twinBASIC provides, and nothing from the C++ runtime. The SQLite amalgamation and SlimDetours link and work; most other C projects do not link without changes. [What can be linked](#what-can-be-linked) lists the limits.

A program uses a library in three steps:

1. Compile the C source to an object file for each architecture the program is built for (see [Compiling the object files](#compiling-the-object-files)).
2. Import the files into the project, into the **Miscellaneous** folder or any other folder (see [Adding files](../../tB/IDE/Projects/Adding-Files#import)).
3. Name each file in an **Import Library** statement, and declare each function the program calls with a **Declare** statement.

A package can carry the files and the statements, so that a project that references it needs neither; the [DetoursLib](../../tB/Packages/Contributed/DetoursLib/) package links SlimDetours this way.

## Syntax
{: index="Import Library; TB5137" }

**Import Library** "*path*" **As** *namespace* [ **Link** "*dependency*" [ **,** "*dependency*" ] ... ]

*path*
: *required* The path of the file in the project, starting with a slash: `"/Miscellaneous/sqlite3_64.obj"`. The file is an object file (`.obj`), a library of object files (`.lib`, as Microsoft's `lib.exe` writes one), or an archive of the same kind (`.a`, as the GNU tools write one).

*namespace*
: *required* The name that **Declare** statements give after **Lib**, without quotes, in place of a DLL's name. A namespace that is also the project's name is ambiguous, and each **Declare** that uses it is compile error TB5137.

*dependency*
: *optional* A string naming where the code finds the functions it calls but does not define: `"stdlib"`, a Windows DLL, or another library of the project. Each is in quotes. See [Dependencies](#dependencies).

The statement is written at the top level of a file, outside any **Module** or **Class**; inside a module it is a syntax error. Its namespace is known in every file of the project.

The file must be for the architecture of the build. A program built for both architectures has a file for each and chooses one with `#If Win64`:

```tb inert=external
#If Win64 Then
    Import Library "/Miscellaneous/sqlite3_64.obj" As SQLITE3 Link "stdlib", "kernel32"
#Else
    Import Library "/Miscellaneous/sqlite3_32.obj" As SQLITE3 Link "stdlib", "kernel32"
#End If
```

## Declaring the functions

An object file names the functions it defines, but not their parameters or return types, so each function the program calls needs a [**Declare**](../../tB/Core/Declare) statement, as a function of a DLL does. **Lib** is followed by the namespace:

```tb inert=external
Module MainModule
    Declare PtrSafe Function sqlite3_open CDecl Lib SQLITE3 (ByVal filename As String, ByRef ppDb As LongPtr) As Long
    Declare PtrSafe Function sqlite3_close CDecl Lib SQLITE3 (ByVal pDb As LongPtr) As Long
End Module
```

The parameters work as they do for a DLL function, and **AddressOf** passes a twinBASIC procedure to a C function that calls it back. The procedure's name, or the name after **Alias**, is the function's name in the file. A name the file does not define is compile error TB5008, on the **Declare**.

### Calling conventions and names

The default calling convention of a C function is `__cdecl`, so its **Declare** names **CDecl**. A **Declare** without a convention keyword is stdcall (see [Calling Conventions](API-Declarations#calling-conventions)); a 64-bit build has only one convention, and ignores the keyword.

In a 32-bit build, a call through a **Declare** that names the wrong convention raises run-time error -353703419 (`&HEAEAEA05`), *Bad DLL definition. Stack corruption detected.* The call returns no value, the stack is put right, and [**On Error**](../../tB/Core/On-Error) can trap the error.

In a 32-bit build, the C compiler decorates the names in the object file. It puts an underscore before the name of a `__cdecl` or `__stdcall` function, which a **Declare** leaves out: twinBASIC adds it. A `__stdcall` function's name also ends with `@` and the size of its arguments, each rounded up to 4 bytes, and that suffix goes into **Alias**. `int __stdcall add_std(int a, short b)` is `_add_std@8` in a 32-bit file and `add_std` in a 64-bit one:

```tb inert=external
#If Win64 Then
    Declare PtrSafe Function add_std Lib MYLIB (ByVal a As Long, ByVal b As Integer) As Long
#Else
    Declare PtrSafe Function add_std Lib MYLIB Alias "add_std@8" (ByVal a As Long, ByVal b As Integer) As Long
#End If
```

A function in a C++ file has a decorated name in either architecture, such as `?add@@YAHHH@Z`, unless the file declares it `extern "C"`. **Alias** takes the decorated name, as `dumpbin /symbols` lists it, but `extern "C"` is simpler.

## Dependencies
{: index="stdlib" }

Code in a library usually calls functions it does not define: functions of the C runtime library, of Windows, or of another library. The statement's **Link** list names where to find them:

`"stdlib"`
: twinBASIC's own implementation of a small part of the C runtime library: functions such as `memset`, `memcpy`, `strcpy`, `strlen`, `toupper`, `malloc` and `free`. It does not have formatted output (`sprintf`), `qsort`, `atoi` or the maths functions (`sin`, `floor`).

A Windows DLL
: The functions the DLL exports, from a table of the Windows DLLs built into the compiler. The DLL is named without `.dll`: `"kernel32"`, `"user32"`, `"ntdll"`. The program calls the functions in the DLL, as a **Declare** would. The Windows SDK's import libraries, such as `user32.lib`, are not used, and an import library cannot be imported (see the warning in [What can be linked](#what-can-be-linked)).

Another library
: The functions defined by the library of another **Import Library** statement, named by its namespace: `"MYHELPERS"`.

A function that neither the file nor its **Link** list defines is compile error TB5058, which names the function. When the function is in `"stdlib"`, in the compiler's table of DLLs or in another library of the project, the error names that too: *linker error: unrecognized symbol '_memcpy' (Link With "stdlib"?)*. A name in the list that is none of these is TB5057.

Each library is linked on its own, so two libraries may define functions of the same name, and each **Declare** reaches the one in its own namespace. Object files that call each other's functions are linked together with **Link**, or put into one `.lib` with `lib.exe`, where they need no **Link**.

## What can be linked

Code links when every function it calls is in its own file or in one that its **Link** list names. That leaves out:

- **Most of the C runtime library.** Only the functions of `"stdlib"` are there.
- **Code compiled for the runtime DLL.** An object file compiled with `/MD` calls the runtime through names that begin `__imp_`, such as `__imp_malloc`, which `"stdlib"` does not define. Compile with `/MT`, the default of `cl.exe`.
- **Buffer security checks.** With `/GS`, which is on unless turned off, a function that has a local array calls `__security_check_cookie`. Compile with `/GS-`.
- **C++ runtime support**: `new` and `delete`, exceptions (`try`, `catch` and `throw`) and run-time type information. A C++ class that needs none of them, such as one created as a local variable, links.
- **Exception handling in a 32-bit build.** `__try` and `__except` need `__except_handler3`, which neither `"stdlib"` nor `"kernel32"` nor `"ntdll"` defines.
- **Whole-program optimisation.** An object file compiled with `/GL` holds no machine code, and is compile error TB5059.

<!-- test: bug static-seh-handler-not-run -->
> [!WARNING] BETA 1034
> In a 64-bit build, code that uses `__try` and `__except` links without an error, but its handler never runs: an exception that it should handle ends the program, in the IDE and in a built exe.

<!-- test: bug import-library-import-lib-crash -->
> [!WARNING] BETA 1034
> An **Import Library** statement that names an import library crashes the compiler, in either architecture. An import library is a `.lib` that lists the functions of a DLL and holds no code, such as the Windows SDK's `user32.lib`. Name a Windows DLL in the **Link** list instead.

The SQLite amalgamation, which is the whole of SQLite in one C file, needs only `"stdlib"` and `"kernel32"`, and SlimDetours needs only `"stdlib"` and `"ntdll"`. Most libraries need more, often other libraries that they were built to link with; each of those must be linked too, within the same limits.

## Compiling the object files

The object files come from Microsoft's C compiler, `cl.exe`, run from a command prompt set up for the architecture: `vcvars32.bat` for a 32-bit build and `vcvars64.bat` for a 64-bit one, both in the `VC\Auxiliary\Build` folder of a Visual Studio installation. The IDE's samples compile with these switches:

```batch
vcvars32.bat
cl /c /Gw /Gy /GS- mylib.c /Fo"mylib_32.obj"
```

```batch
vcvars64.bat
cl /c /Gw /Gy /GS- mylib.c /Fo"mylib_64.obj"
```

`/c` compiles without linking, and writes the object file. `/GS-` turns off the buffer security checks. `/Gy` and `/Gw` put each function and each global variable in a section of its own; a file compiled without them links too.

`lib.exe` puts several object files into one library: `lib /out:mylib_64.lib first.obj second.obj`.

A project in Visual Studio compiles with other defaults, which stop its object files linking: the runtime DLL (`/MD`, or `/MDd` in the Debug configuration), buffer security checks (`/GS`), and in the Release configuration whole-program optimisation (`/GL`). Change them in the project's properties, or compile from the command line.

## Errors

TB5008 and TB5010 are reported on a **Declare**. The others are reported at line 1 of the file that holds the **Import Library** statement.

### TB5008: unrecognized symbol '*name*' in static library '*namespace*'
{: index="TB5008" }

A **Declare** names a function that the library does not define. In a 32-bit build, check the name's decoration (see [Calling conventions and names](#calling-conventions-and-names)). The error follows TB5059 and TB5060 for each **Declare** of the library, since the library then defines nothing.

### TB5010: internal error loading static library '*namespace*'
{: index="TB5010" }

The library could not be loaded. It follows TB5095, on each **Declare** of the library.

### TB5056: unexpected relocation type *n* on X64. Check LIB/OBJ file is designed for this platform.
{: index="TB5056" }

The file holds a kind of address that the linker cannot fix up. The tables of C++ exception handling give this error in a 64-bit build.

### TB5057: referenced library '*name*' not found
{: index="TB5057" }

A name in the **Link** list is not `"stdlib"`, a DLL of the compiler's table or a namespace of the project. `"msvcrt"` is not in the table.

### TB5058: unrecognized symbol '*name*'
{: index="TB5058" }

The code calls a function, or reads a variable, that neither the file nor its **Link** list defines (see [Dependencies](#dependencies)). The name is the one in the file, decorated: `_memcpy` in a 32-bit file, `memcpy` in a 64-bit one.

### TB5059: incorrect OBJ file format, file is empty
{: index="TB5059" }

The file has nothing to link. An object file compiled with `/GL` gives this error.

### TB5060: incorrect OBJ file format, expected x86
{: index="TB5060" }

The file is not an object file for the architecture of the build: it is for the other one, or is not an object file at all. A 64-bit build says `expected x64`.

### TB5095: unable to open library file '*path*'
{: index="TB5095" }

The project has no file at that path.

## Example

A C file, `mathlib.c`, defines one function:

```c
int add(int a, int b) { return a + b; }
```

It is compiled twice, as in [Compiling the object files](#compiling-the-object-files), to `mathlib_32.obj` and `mathlib_64.obj`, and both files are imported into the project's **Miscellaneous** folder. The function needs nothing from outside the file, so the statement has no **Link** list:

```tb inert=external
#If Win64 Then
    Import Library "/Miscellaneous/mathlib_64.obj" As MATHLIB
#Else
    Import Library "/Miscellaneous/mathlib_32.obj" As MATHLIB
#End If

Module MainModule
    Private Declare PtrSafe Function add CDecl Lib MATHLIB (ByVal a As Long, ByVal b As Long) As Long

    Public Sub Main()
        Debug.Print add(2, 3)
    End Sub
End Module
```

```text
5
```

The New Project dialog has two larger [samples](../../tB/IDE/Project/New#samples): **Static Library Example (SQLITE3)**, which links SQLite, and **Static Library Example (libdeflate)**, which links the libdeflate compression library from `.a` files.

## See Also

- [Declare](../../tB/Core/Declare) statement
- [Enhanced API Declarations](API-Declarations) -- calling conventions
- [Direct Assembly Insertion](Assembly) -- machine code written into a procedure, with no C compiler
- [DetoursLib](../../tB/Packages/Contributed/DetoursLib/) package -- links SlimDetours
