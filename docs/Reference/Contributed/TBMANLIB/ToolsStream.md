---
title: ToolsStream
parent: TBMANLIB Package
permalink: /tB/Packages/Contributed/TBMANLIB/ToolsStream
has_toc: false
---

# ToolsStream module
{: .no_toc }

Reads and writes whole files as text in a chosen character set, or as an array of bytes. The functions use the ADODB.Stream object of the ADO 2.8 library, which is part of Windows. [**cJson**](cJson) uses the text functions for its [**LoadFrom**](cJson#loadfrom) and [**SaveTo**](cJson#saveto).

All four functions work through one stream object, [**Inst**](#inst), that every caller in the program shares. That has two consequences, which the entries for the functions describe: a text function that fails leaves the stream open, and a binary function leaves it set to the binary type.

```tb check_build check_run
Dim Path As String
Path = Environ$("TEMP") & "\tbmanlib-docs-stream.txt"

ToolsStream.SaveFileAsText Path, "line 1" & vbCrLf & "line 2"
Debug.Print ToolsStream.LoadFileAsText(Path) = "line 1" & vbCrLf & "line 2"
Kill Path
' Output:
' True
```

* TOC
{:toc}

## Members

### Inst
{: .no_toc }

The shared **ADODB.Stream** object that all the functions of the module use. A field, declared `Public Inst As New ADODB.Stream`, created the first time it is used.

A program can use it, for example to close a stream that a failed call left open: `ToolsStream.Inst.Close`. The program needs no reference to the ADO library for that.

### LastError
{: .no_toc }

A **String** field. [**LoadFileAsBinary**](#loadfileasbinary) and [**SaveFileAsBinary**](#savefileasbinary) set it to an empty string when they start, and to the text of the error when they fail. The two text functions neither set it nor clear it.

### LoadFileAsBinary
{: .no_toc }

Reads a whole file into a byte array.

Syntax: **ToolsStream.LoadFileAsBinary** ( *Path* **,** *OutData* ) **As Boolean**

*Path*
: *required* A **String**, the file to read. A name without a folder is looked for in the current folder of the program.

*OutData*
: *required* A dynamic **Byte** array. It receives the bytes of the file.

Returns **True** when the file was read, and **False** when an error occurred; the text of the error is then in [**LastError**](#lasterror). The function closes the stream if it is open, sets the stream to the binary type and leaves it so.

The text in **LastError** is the description of the error, then `#`, then the description a second time. The number of the error is not in it.

```tb check_build check_run
Dim Bytes() As Byte
Debug.Print ToolsStream.LoadFileAsBinary(Environ$("TEMP") & "\tbmanlib-docs-missing.bin", Bytes)
Debug.Print ToolsStream.LastError
If ToolsStream.Inst.State <> 0 Then ToolsStream.Inst.Close
ToolsStream.Inst.Type = 2
' Output:
' False
' File could not be opened.#File could not be opened.
```

### LoadFileAsText
{: .no_toc }

Reads a whole file as text and returns it.

Syntax: **ToolsStream.LoadFileAsText** ( *FileName* [ **,** *CharSet* ] ) **As String**

*FileName*
: *required* A **String**, the file to read. A name without a folder is looked for in the current folder of the program.

*CharSet*
: *optional* A **String**, the name of the character set in which the file is stored, `UTF-8` by default. Any name that the ADODB.Stream accepts can be used. A byte order mark at the start of a UTF-8 file is not returned as a character.

The function opens the stream, sets its character set, loads the file and reads all the text from it. It does not set the type of the stream. It handles no error: a failure is raised to the caller as the error of the stream.

> [!WARNING]
> In version 1.0.0.5, a failed text call leaves the shared stream open, and a binary call leaves it set to the binary type. Both break the calls that follow.
>
> When the file cannot be opened, the call raises error 3002, *File could not be opened*, and the call that closes the stream is never reached. Every later call to **LoadFileAsText** or [**SaveFileAsText**](#savefileastext) then fails in its first step, which opens a stream that is already open, with error 3705, *Operation is not allowed when the object is open*. The calls work again after `ToolsStream.Inst.Close`, or after a binary function, which closes an open stream first. [**cJson.LoadFrom**](cJson#loadfrom) and [**cJson.SaveTo**](cJson#saveto) are affected in the same way.
>
> A binary function sets the stream to the binary type, and the text functions do not set it back. After a call to [**LoadFileAsBinary**](#loadfileasbinary) or [**SaveFileAsBinary**](#savefileasbinary), a text function fails with error 3219, *Operation is not allowed in this context*. Setting the type back to text with `ToolsStream.Inst.Type = 2`, on the closed stream, makes the text functions work again.

```tb check_build check_run
Dim Path As String
Dim Text As String
Dim Bytes() As Byte

Path = Environ$("TEMP") & "\tbmanlib-docs-stream2.txt"
ToolsStream.SaveFileAsText Path, "hello"

On Error Resume Next
Text = ToolsStream.LoadFileAsText(Environ$("TEMP") & "\tbmanlib-docs-missing.txt")
Debug.Print Err.Number & " " & Err.Description
Err.Clear
Text = ToolsStream.LoadFileAsText(Path)
Debug.Print Err.Number & " " & Err.Description
Err.Clear
ToolsStream.Inst.Close
Debug.Print ToolsStream.LoadFileAsText(Path)

Bytes = ToolsStr.ToBytes("abc")
Debug.Print ToolsStream.SaveFileAsBinary(Path, Bytes)
Text = ToolsStream.LoadFileAsText(Path)
Debug.Print Err.Number & " " & Err.Description
Err.Clear
If ToolsStream.Inst.State <> 0 Then ToolsStream.Inst.Close
ToolsStream.Inst.Type = 2
Debug.Print ToolsStream.LoadFileAsText(Path)
Kill Path
' Output:
' 3002 File could not be opened.
' 3705 Operation is not allowed when the object is open.
' hello
' True
' 3219 Operation is not allowed in this context.
' abc
```

### SaveFileAsBinary
{: .no_toc }

Writes a byte array to a file.

Syntax: **ToolsStream.SaveFileAsBinary** ( *Path* **,** *OutData* ) **As Boolean**

*Path*
: *required* A **String**, the file to write. An existing file is replaced. The folder must exist.

*OutData*
: *required* A **Byte** array whose bytes are written. The parameter is called *OutData*, as in [**LoadFileAsBinary**](#loadfileasbinary), though here it is the input.

Returns **True** when the file was written, and **False** when an error occurred; [**LastError**](#lasterror) then holds the text of the error, in the form described for **LoadFileAsBinary**. The stream is closed first if it was open, set to the binary type, and left so.

```tb check_build check_run
Dim Path As String
Dim Bytes() As Byte
Dim Back() As Byte

Path = Environ$("TEMP") & "\tbmanlib-docs-stream.bin"
Bytes = ToolsStr.ToBytes("abc")

Debug.Print ToolsStream.SaveFileAsBinary(Path, Bytes)
Debug.Print ToolsStream.LoadFileAsBinary(Path, Back)
Debug.Print UBound(Back)
Kill Path

' The stream is binary now; return it to text for the text functions.
ToolsStream.Inst.Type = 2
' Output:
' True
' True
' 2
```

### SaveFileAsText
{: .no_toc }

Writes a string to a file as text.

Syntax: **ToolsStream.SaveFileAsText** ( *FileName* **,** *Data* [ **,** *CharSet* ] ) **As Boolean**

*FileName*
: *required* A **String**, the file to write. An existing file is replaced. The folder must exist.

*Data*
: *required* A **String**, the text to write. It is passed by reference. The function adds no line break to it.

*CharSet*
: *optional* A **String**, the name of the character set, `UTF-8` by default.

The function opens the stream, sets its character set, writes the text and saves the file. A character set of `UTF-8` writes the byte order mark EF BB BF at the start of the file. The folder of the file has to exist: when it does not, the call raises error 3004, *Write to file failed*.

> [!WARNING]
> The function always returns **False**. Its result is never set, even when the file was written. A program cannot use the result to see whether the call worked, and has to handle the error that the stream raises.

```tb check_build check_run
Dim Path As String
Path = Environ$("TEMP") & "\tbmanlib-docs-stream3.txt"
Debug.Print ToolsStream.SaveFileAsText(Path, "hello")
Debug.Print Dir(Path) = "tbmanlib-docs-stream3.txt"
Kill Path
' Output:
' False
' True
```

A failure is raised to the caller and the stream stays open; see the warning for [**LoadFileAsText**](#loadfileastext).

## See Also

- [cJson](cJson) class -- uses **LoadFileAsText** and **SaveFileAsText**
- [ToolsUtf8](ToolsUtf8) module -- converts between UTF-8 bytes and strings, without a stream
- [ToolsFso](ToolsFso) module -- folders and path names
- [TBMANLIB](.) package -- overview
