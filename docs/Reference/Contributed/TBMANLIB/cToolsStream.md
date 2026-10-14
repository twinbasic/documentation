---
title: cToolsStream
parent: TBMANLIB Package
permalink: /tB/Packages/Contributed/TBMANLIB/cToolsStream
has_toc: false
---

# cToolsStream class
{: .no_toc }

Reads and writes whole files as text in a chosen character set, or as an array of bytes, and can hold the text as a collection of lines. The class uses the ADODB.Stream object of the ADO 2.8 library, which is part of Windows. [**cJson**](cJson) uses it for its [**LoadFrom**](cJson#loadfrom) and [**SaveTo**](cJson#saveto), and [**cHttpClient**](cHttpClient) for its file transfers.

The package keeps one instance of the class, named **ToolsStream**, in the module [**Tools**](Tools), so a program writes `ToolsStream.LoadFileAsText(...)` without a `New`, and the syntax lines below use that name. In the package's earlier versions **ToolsStream** was a module, and the calls are the same. A program that wants a stream of its own writes `Dim S As New cToolsStream`.

All the functions of an object work through one stream object, [**Inst**](#inst). The text functions leave it open, which the next text call does not expect; see the warning below.

```tb check_build check_run
Dim Path As String
Path = Environ$("TEMP") & "\tbmanlib-docs-stream.txt"

Dim S As New cToolsStream
S.SaveFileAsText Path, "line 1" & vbCrLf & "line 2"
S.Inst.Close
Debug.Print S.LoadFileAsText(Path) = "line 1" & vbCrLf & "line 2"
Kill Path
' Output:
' True
```

> [!WARNING] 1.0.0.29
> [**LoadFileAsText**](#loadfileastext) and [**SaveFileAsText**](#savefileastext) leave the stream open, and neither closes it first. That breaks the next call of either on the same object, and the shared **ToolsStream** is such an object for the whole run of the program:
>
> - A **LoadFileAsText** that finds the stream open raises error 3705, *Operation is not allowed when the object is open*, before it reads anything. It finds it open after any earlier text call, a failed one included.
> - A **SaveFileAsText** that finds the stream open writes its text over the text the stream still holds, from the start, and saves the whole stream. When the new text is shorter than the old, the end of the old text stays in the file: after saving `0123456789` and then `abc`, the file holds `abc3456789`. No error is raised.
> - [**LoadFileAsBinary**](#loadfileasbinary) and [**SaveFileAsBinary**](#savefileasbinary) close an open stream first and close it at the end, so a text call works after them.
>
> [**cJson.SaveTo**](cJson#saveto) and [**cJson.LoadFrom**](cJson#loadfrom), which use the shared stream, are affected: a second **SaveTo** with a shorter document writes a JSON text with the end of the earlier one after it, and a **LoadFrom** after any earlier **SaveTo** or **LoadFrom** fails. The calls work when the stream is closed after each text call with `ToolsStream.Inst.Close`, or when each call uses a new **cToolsStream**, whose stream is closed when the object is released.

```tb check_build check_run
Dim Path As String
Path = Environ$("TEMP") & "\tbmanlib-docs-stream2.txt"

Dim S As New cToolsStream
Dim Text As String
S.SaveFileAsText Path, "0123456789"
S.SaveFileAsText Path, "abc"
S.Inst.Close
Debug.Print S.LoadFileAsText(Path)

On Error Resume Next
Text = S.LoadFileAsText(Path)
Debug.Print Err.Number & " " & Err.Description
On Error GoTo 0
S.Inst.Close
Debug.Print S.LoadFileAsText(Path)
Kill Path
' Output:
' abc3456789
' 3705 Operation is not allowed when the object is open.
' abc3456789
```

* TOC
{:toc}

## Members

### Inst
{: .no_toc }

The **ADODB.Stream** object that the functions of the object use. A field, declared `Public Inst As New ADODB.Stream`, created the first time it is used.

A program can use it, for example to close a stream that a text call left open: `ToolsStream.Inst.Close`. The program needs no reference to the ADO library for that. When the object is released, its stream is closed if it is open.

### LastError
{: .no_toc }

A **String** field. [**LoadFileAsBinary**](#loadfileasbinary) and [**SaveFileAsBinary**](#savefileasbinary) set it to an empty string when they start, and to the text of the error when they fail. The functions for text neither set it nor clear it.

### LineData
{: .no_toc }

A **Collection** field, declared `Public LineData As New Collection`. In line mode ([**UseLine**](#useline)), [**LoadFileAsText**](#loadfileastext) replaces it with the lines of the file, numbered from 1, and [**ReadLine**](#readline) reads from it. It is empty until then.

### LineNumber
{: .no_toc }

A **Long** field, 0 at the start. The number of the line that [**ReadLine**](#readline) and [**WriteLine**](#writeline) use next. **LoadFileAsText** sets it to 1 in line mode, and **ReadLine** adds 1 after each line. A program can assign to it.

### LoadFileAsBinary
{: .no_toc }

Reads a whole file into a byte array.

Syntax: **ToolsStream.LoadFileAsBinary** ( *Path* **,** *OutData* ) **As Boolean**

*Path*
: *required* A **String**, the file to read. A name without a folder is looked for in the current folder of the program.

*OutData*
: *required* A dynamic **Byte** array. It receives the bytes of the file.

Returns **True** when the file was read, and **False** when an error occurred; the text of the error is then in [**LastError**](#lasterror). The function closes the stream if it is open, sets it to the binary type, reads the file and closes the stream.

The text in **LastError** is the description of the error, then `#`, then the description a second time. The number of the error is not in it.

```tb check_build check_run
Dim S As New cToolsStream
Dim Bytes() As Byte
Debug.Print S.LoadFileAsBinary(Environ$("TEMP") & "\tbmanlib-docs-missing.bin", Bytes)
Debug.Print S.LastError
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

The function sets the type of the stream to text, opens it, sets its character set, loads the file and reads all the text from it. It leaves the stream open, with its position at the start. It handles no error: a failure, such as error 3002, *File could not be opened*, for a file that does not exist, is raised to the caller as the error of the stream, and leaves the stream open.

In line mode, the text is also split into lines with [**SplitLinesToCollection**](cToolsStr#splitlinestocollection), which is stored in [**LineData**](#linedata), and [**LineNumber**](#linenumber) is set to 1. The function still returns the whole text. The rules of the split apply, among them that a last line of one character is lost.

See the warning at the top of the page for the calls that follow.

### ReadLine
{: .no_toc }

Returns a line of [**LineData**](#linedata).

Syntax: **ToolsStream.ReadLine** ( [ *Line* ] ) **As String**

*Line*
: *optional* A **Long**. When it is greater than 0, it is stored in [**LineNumber**](#linenumber) first, and that line is read.

Returns the item of **LineData** that **LineNumber** names, and adds 1 to **LineNumber**. A number that is not the number of an item raises error 9, *Subscript out of range*. When line mode is off, the function raises error 1 with a Chinese message that means *line reading and writing is not switched on*.

```tb check_build check_run
Dim Path As String
Path = Environ$("TEMP") & "\tbmanlib-docs-lines.txt"

Dim S As New cToolsStream
S.UseLineMode True
S.SaveFileAsText Path, "first" & vbCrLf & "second" & vbCrLf & "third"
S.Inst.Close
S.LoadFileAsText Path
S.Inst.Close

Debug.Print S.ReadLine() & " " & S.ReadLine() & " " & S.LineNumber
Debug.Print S.ReadLine(1)
Kill Path
' Output:
' first second 3
' first
```

### SaveFileAsBinary
{: .no_toc }

Writes a byte array to a file.

Syntax: **ToolsStream.SaveFileAsBinary** ( *Path* **,** *OutData* ) **As Boolean**

*Path*
: *required* A **String**, the file to write. An existing file is replaced. The folder must exist.

*OutData*
: *required* A **Byte** array whose bytes are written. The parameter is called *OutData*, as in [**LoadFileAsBinary**](#loadfileasbinary), though here it is the input.

Returns **True** when the file was written, and **False** when an error occurred; [**LastError**](#lasterror) then holds the text of the error, in the form described for **LoadFileAsBinary**. The stream is closed first if it was open, set to the binary type, and closed again at the end.

```tb check_build check_run
Dim Path As String
Dim Bytes() As Byte
Dim Back() As Byte
Dim S As New cToolsStream

Path = Environ$("TEMP") & "\tbmanlib-docs-stream.bin"
Bytes = ToolsStr.ToBytes("abc")

Debug.Print S.SaveFileAsBinary(Path, Bytes)
Debug.Print S.LoadFileAsBinary(Path, Back)
Debug.Print UBound(Back)
Kill Path
' Output:
' True
' True
' 2
```

### SaveFileAsText
{: .no_toc }

Writes a string to a file as text.

Syntax: **ToolsStream.SaveFileAsText** ( *FileName* [ **,** *Data* ] [ **,** *CharSet* ] ) **As Boolean**

*FileName*
: *required* A **String**, the file to write. An existing file is replaced. The folder must exist: when it does not, the call raises error 3004, *Write to file failed*.

*Data*
: *optional* A **String**, the text to write. It is declared optional, and meant to default to the lines of [**LineData**](#linedata) in line mode, or to the text the stream already holds. Neither default works: a **String** that is left out is a null string, not a missing argument, so the call tries to write a null string and raises error 3001, *Arguments are of the wrong type, are out of acceptable range, or are in conflict with one another*. Pass the text, an empty string if need be.

*CharSet*
: *optional* A **String**, the name of the character set, `UTF-8` by default. A character set of `UTF-8` writes the byte order mark EF BB BF at the start of the file.

The function opens the stream if it is closed, sets its character set, writes the text into it and saves the file. It leaves the stream open. The function adds no line break to the text. See the warning at the top of the page for what happens when the stream is already open.

> [!WARNING]
> The function always returns **False**. Its result is never set, even when the file was written. A program cannot use the result to see whether the call worked, and has to handle the error that the stream raises.

```tb check_build check_run
Dim Path As String
Dim S As New cToolsStream
Path = Environ$("TEMP") & "\tbmanlib-docs-stream3.txt"
Debug.Print S.SaveFileAsText(Path, "hello")
Debug.Print Dir(Path) = "tbmanlib-docs-stream3.txt"
Kill Path
' Output:
' False
' True
```

### UseLine
{: .no_toc }

A **Boolean** field, **False** at the start. **True** when line mode is on. Set it with [**UseLineMode**](#uselinemode).

### UseLineMode
{: .no_toc }

Switches line mode on or off, and returns the object.

Syntax: *object*.**UseLineMode** ( *v* ) **As cToolsStream**

*v*
: *required* A **Boolean**. **True** turns line mode on.

The function stores *v* in [**UseLine**](#useline) and returns the object itself, so a call can be chained: `S.UseLineMode(True).LoadFileAsText(Path)`.

### WriteLine
{: .no_toc }

Meant to store a line in [**LineData**](#linedata).

Syntax: **ToolsStream.WriteLine** ( *Text* [ **,** *Line* ] ) **As Boolean**

*Text*
: *required* A **String**, the line.

*Line*
: *optional* A **Long**. When it is greater than 0, it is stored in [**LineNumber**](#linenumber) first.

> [!NOTE]
> The function raises error 13 every time line mode is on. It adds the line to the collection with `LineData.Add Text, LineNumber`, and a collection takes a **String** as the key of an item, not a **Long**. Items can be added to **LineData** directly with its own **Add**. When line mode is off, the function raises error 1 with a Chinese message that means *line reading and writing is not switched on*.

## See Also

- [Tools](Tools) module -- the shared instance **ToolsStream**
- [cJson](cJson) class -- uses **LoadFileAsText** and **SaveFileAsText**
- [cHttpClient](cHttpClient) class -- downloads and uploads files with the binary functions
- [cToolsStr](cToolsStr) class -- the split into lines and the conversion of bytes
- [ToolsUtf8](ToolsUtf8) module -- converts between UTF-8 bytes and strings, without a stream
- [ToolsFso](ToolsFso) module -- folders and path names
- [TBMANLIB](.) package -- overview
