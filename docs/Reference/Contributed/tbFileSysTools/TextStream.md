---
title: TextStream
parent: tbFileSysTools Package
permalink: /tB/Packages/Contributed/tbFileSysTools/TextStream
has_toc: false
---

# TextStream class
{: .no_toc }

A **TextStream** reads text from a file, or writes text to one, a piece at a time. It converts between the encoding of the file and the strings of the program, so the code sees text and not bytes, and the file can be of any size. It has the members of the **TextStream** of the Scripting Runtime, and adds [**Flush**](#flush), [**Encoding**](#encoding) and [**IsStreaming**](#isstreaming).

A **TextStream** is not created with **New**. These return one:

- [**OpenTextFile**](FileSystemTools#opentextfile) and [**CreateTextFile**](FileSystemTools#createtextfile), and the same members of [**FileSystemObject**](FileSystemObject);
- [**File.OpenAsTextStream**](File#openastextstream) and [**Folder.CreateTextFile**](Folder#createtextfile);
- [**GetStandardStream**](FileSystemTools#getstandardstream), for the standard input, output and error streams.

```tb check_build check_run
Dim work As String, path As String
work = BuildPath(Environ$("TEMP"), GetTempName("fst", ""))
CreateFolder work
path = BuildPath(work, "log.txt")

Dim ts As TextStream
Set ts = CreateTextFile(path, True, encUtf16Bom)
ts.WriteLine "alpha"
ts.WriteLine "beta"
ts.Close
Debug.Print GetFile(path).Size            ' 28

Set ts = OpenTextFile(path)
Debug.Print ts.Encoding = encUtf16Bom     ' True
Debug.Print ts.ReadLine                   ' alpha
Debug.Print ts.Line                       ' 2
Debug.Print ts.ReadLine                   ' beta
Debug.Print ts.AtEndOfStream              ' True
ts.Close

DeleteFolder work
```

The members, by purpose: [AtEndOfLine](#atendofline), [AtEndOfStream](#atendofstream), [Read](#read), [ReadAll](#readall), [ReadLine](#readline), [Skip](#skip) and [SkipLine](#skipline) read; [Write](#write), [WriteBlankLines](#writeblanklines), [WriteLine](#writeline) and [Flush](#flush) write; [Close](#close) ends the stream; [Column](#column), [Line](#line), [Encoding](#encoding) and [IsStreaming](#isstreaming) describe it.

## Reading and writing

A stream is open for reading or for writing, as the [**IOMode**](FileSystemTools#iomode) of [**OpenTextFile**](FileSystemTools#opentextfile) says; **ForAppending** is a way to write. A read member on a stream open for writing, and a write member on a stream open for reading, raises error 54 (*Stream is not open for reading* or *for writing*).

**Encoding.** For reading, the encoding is found when the stream is opened: a BOM in the file first, then the *encoding* that was asked for, then the same guess as [**GetFileEncoding**](FileSystemTools#getfileencoding). The BOM is skipped, and is not part of the text. For writing, the *encoding* given when the stream was opened is used, and **encAutoDetect** means UTF-8. A BOM is written once, when a file is created or emptied, by an encoding with **Bom** in its name; text added to an existing file never gets another one. [**Encoding**](#encoding) returns the result.

**Line endings.** The reading members accept CR LF, LF and CR as line endings, also mixed in one file. [**WriteLine**](#writeline) and [**WriteBlankLines**](#writeblanklines) write the line ending of the stream: the one given when it was opened, or for **ForAppending** to a file that has text, the one that the start of the file uses. [**Write**](#write) writes its text unchanged.

**Large files.** [**ReadLine**](#readline), [**Read**](#read), [**Write**](#write) and appending have no limit on the size of the file. [**ReadAll**](#readall) is limited by the size of a **String**: it raises error 7 when more than 2 GB remain. The same limit applies to [**TextFileToString**](FileSystemTools#textfiletostring) and to [**ReadStream**](FileSystemTools#readstream) of a whole file, which raise error 7 for a file of 2,200,000,000 bytes; [**File.Size**](File#size) and [**Folder.Size**](Folder#size) return such a size exactly.

```tb check_build
Dim work As String, big As String, ts As TextStream, b() As Byte
work = BuildPath(Environ$("TEMP"), GetTempName("fst", ""))
CreateFolder work
big = BuildPath(work, "big.dat")

' A file of 2,200,000,000 bytes: it needs that much free space.
CreateObject("WScript.Shell").Run "cmd /c fsutil file createnew """ & big & """ 2200000000 >nul", 0, True
Debug.Print GetFile(big).Size                 ' 2200000000

Set ts = OpenTextFile(big, ForReading, , encLatin1)
Debug.Print Len(ts.Read(5))                   ' 5
ts.Close

Set ts = OpenTextFile(big, ForAppending, , encLatin1)
ts.WriteLine "x"
ts.Close
Debug.Print GetFile(big).Size                 ' 2200000003

ReadStream big, b, 10
Debug.Print UBound(b) + 1                     ' 10

DeleteFolder work
```

**Two modes.** Most encodings, UTF-8 among them, are read and written in pieces of 64 KB, and [**IsStreaming**](#isstreaming) is **True**. UTF-7 cannot be cut into pieces. A stream in UTF-7 holds the whole file in memory and [**IsStreaming**](#isstreaming) is **False**. Every member works in both modes.

<!-- test: TextStreamTests.OpenTextFile_Utf7ReadOnlyFileForWriting_Opens, TextStreamTests.TextStreamClose_Utf7ReadOnlyFile_Raises70, TextStreamTests.TextStreamFlush_Utf7ReadOnlyFile_Raises70, TextStreamTests.OpenTextFile_Utf7ForWriting_KeepsTextUntilClose -->
> [!NOTE]
> A stream of this kind that is open for writing does not empty the file when it is opened: the file is replaced when the stream is closed or flushed. When the file is read-only, the stream opens without an error, the file keeps its text, and the first [**Flush**](#flush) or [**Close**](#close) fails with error 70.

**Position.** [**Line**](#line) and [**Column**](#column) follow the characters that are read or written. Reading a line moves past its line ending.

**Standard streams.** A stream returned by [**GetStandardStream**](FileSystemTools#getstandardstream) has the reading members when it is the standard input, and the writing members when it is the standard output or error. The other direction raises error 54. [**Close**](#close) ends the object and leaves the handle of the process open. [**Encoding**](#encoding) returns **encSystemAnsi** and [**IsStreaming**](#isstreaming) returns **False** for these streams.

## Errors

- 52 -- the stream is closed.
- 54 -- the member does not fit the direction of the stream.
- 62 -- reading at or past the end of the stream.
- 5 -- an invalid argument, such as a negative count for [**Read**](#read).
- 7 -- [**ReadAll**](#readall) of more than 2 GB.

The Scripting Runtime raises 54 and 62 for the same mistakes. For a closed stream it raises 91 (*Object variable not set*), not 52.

## Properties

### AtEndOfLine
{: .no_toc }

Whether the next character to read is a line ending.

Syntax: *object*.**AtEndOfLine** **As Boolean**

**True** when the next character is a carriage return or a line feed. **False** at the end of the stream, and for any other character. Nothing is consumed. Raises error 54 on a stream open for writing.

### AtEndOfStream
{: .no_toc }

Whether the stream has no more text to read.

Syntax: *object*.**AtEndOfStream** **As Boolean**

**True** when everything has been read. The check may read ahead in the file, but it consumes nothing, and it can raise the errors of a read. Raises error 54 on a stream open for writing. On a standard input, it waits until the next input arrives or the input ends.

### Column
{: .no_toc }

The column of the next character to read or write.

Syntax: *object*.**Column** **As Long**

The first column is 1. Columns count UTF-16 code units, so a character outside the Basic Multilingual Plane, which takes two, advances the column by two. Reading and writing both advance the column. It is 1 after a line ending.

### Encoding
{: .no_toc }

The encoding of the stream.

Syntax: *object*.**Encoding** **As TextEncoding**

A [**TextEncoding**](FileSystemTools#textencoding) member. For a stream open for reading it is the encoding that was found; for one open for writing, the encoding that was asked for, with **encAutoDetect** read as **encUtf8**. A negative value means that the file has a BOM. An empty file that is opened for reading reports **encUtf8** when no encoding was given. For a standard stream, also one made with *unicode* **True**, the property returns **encSystemAnsi**.

### IsStreaming
{: .no_toc }

Whether the stream works in pieces or holds the whole file.

Syntax: *object*.**IsStreaming** **As Boolean**

**True** for the encodings that can be read and written in pieces, which is nearly all. **False** when the stream holds the whole file in memory, as described under Two modes above. A standard stream returns **False**.

### Line
{: .no_toc }

The line of the next character to read or write.

Syntax: *object*.**Line** **As Long**

The first line is 1. Each line ending that is read or written adds 1; CR LF counts once. Writing counts as well: after `Write "abc" & vbCrLf & "de"`, **Line** is 2 and [**Column**](#column) is 3. A CR and an LF written by two separate calls count as two line endings.

```tb check_build check_run
Dim work As String, ts As TextStream
work = BuildPath(Environ$("TEMP"), GetTempName("fst", ""))
CreateFolder work

Set ts = CreateTextFile(BuildPath(work, "pos.txt"))
ts.Write "abc" & vbCrLf & "de"
Debug.Print ts.Line & "," & ts.Column     ' 2,3
ts.Close

DeleteFolder work
```

## Methods

### Close
{: .no_toc }

Ends the stream.

Syntax: *object*.**Close**

Writes the text that is still waiting to be written, and closes the file. Calling it again does nothing. A reading or writing member called afterwards raises error 52; [**Line**](#line), [**Column**](#column), [**Encoding**](#encoding) and [**IsStreaming**](#isstreaming) still answer. A stream that is released without **Close** is closed when the object is destroyed, with its waiting text written: after `ts.Write "x"` and `Set ts = Nothing` the file is one byte long. A program should still call **Close**.

```tb check_build check_run
Dim work As String, path As String, ts As TextStream
work = BuildPath(Environ$("TEMP"), GetTempName("fst", ""))
CreateFolder work
path = BuildPath(work, "x.txt")

Set ts = CreateTextFile(path)
ts.Write "x"
Set ts = Nothing
Debug.Print GetFile(path).Size     ' 1

DeleteFolder work
```

### Flush
{: .no_toc }

Writes the waiting text to the file.

Syntax: *object*.**Flush**

For a stream that works in pieces, the text that is held back is encoded and handed to Windows, and the file stays open. This does not wait for the disk to confirm it. For a stream that holds the whole file, the whole file is written again. For a stream open for reading, nothing happens. Raises error 52 when the stream is closed.

### Read
{: .no_toc }

Reads a number of characters.

Syntax: *object*.**Read** ( *characters* ) **As String**

*characters*
: *required* A **Long**, the number of characters to read. Characters count UTF-16 code units. A value of 0 returns an empty string. A negative value is error 5.

Returns that many characters, or all that remain when fewer are left. Line endings are returned as they are in the file. Raises error 62 when the stream is already at its end.

### ReadAll
{: .no_toc }

Reads everything that is left.

Syntax: *object*.**ReadAll** **As String**

Returns the rest of the stream, which is an empty string at the end of the stream, and for an empty file. The Scripting Runtime raises error 62 there. The text is decoded in one step and kept in memory, so a very large file is better read with [**ReadLine**](#readline). Raises error 7, without reading anything, when the rest is more than 2 GB.

```tb check_build check_run
Dim work As String, path As String, ts As TextStream
work = BuildPath(Environ$("TEMP"), GetTempName("fst", ""))
CreateFolder work
path = BuildPath(work, "empty.txt")
StringToTextFile "", path

Set ts = OpenTextFile(path)
Debug.Print "[" & ts.ReadAll & "]"       ' []
ts.Skip 3                                ' nothing happens at the end

On Error Resume Next
ts.SkipLine
Debug.Print Err.Number                   ' 62
Err.Clear
On Error GoTo 0
ts.Close

DeleteFolder work
```

### ReadLine
{: .no_toc }

Reads one line.

Syntax: *object*.**ReadLine** **As String**

Returns the text up to the next line ending, without the line ending. CR LF, LF and CR each end a line. The last line is returned also when no line ending follows it. Raises error 62 when the stream is already at its end.

### Skip
{: .no_toc }

Skips a number of characters.

Syntax: *object*.**Skip** ( *characters* )

*characters*
: *required* A **Long**, the number of characters to skip. A value of 0 or less does nothing.

Does nothing at the end of the stream, where [**SkipLine**](#skipline) raises error 62. The Scripting Runtime raises error 62 for **Skip** at the end too.

### SkipLine
{: .no_toc }

Skips one line.

Syntax: *object*.**SkipLine**

Skips the text and the line ending of the next line. Raises error 62 when the stream is already at its end.

### Write
{: .no_toc }

Writes text.

Syntax: *object*.**Write** ( *text* )

*text*
: *required* A **String**. It is written as it is, and no line ending is added.

A stream that works in pieces holds the text back until 65,536 characters have collected, or until [**Flush**](#flush) or [**Close**](#close); a stream that holds the whole file writes it at **Flush** or **Close**. A surrogate pair is never cut between two pieces. For a code page that cannot hold a character, the character is replaced by the substitute of the code page, without an error; UTF-8 and GB18030 raise error 5 for an unpaired surrogate.

### WriteBlankLines
{: .no_toc }

Writes empty lines.

Syntax: *object*.**WriteBlankLines** ( *lines* )

*lines*
: *required* A **Long**, the number of line endings to write.

### WriteLine
{: .no_toc }

Writes text and a line ending.

Syntax: *object*.**WriteLine** ( [ *text* ] )

*text*
: *optional* A **String** to write before the line ending. Default: an empty string, which writes a line ending alone.

The line ending is the one of the stream: see Line endings above.

## See Also

- [FileSystemTools](FileSystemTools) module -- [OpenTextFile](FileSystemTools#opentextfile), [CreateTextFile](FileSystemTools#createtextfile) and [GetStandardStream](FileSystemTools#getstandardstream) create streams
- [File](File#openastextstream) class -- **OpenAsTextStream** opens a file as a stream
- [Folder](Folder#createtextfile) class -- **CreateTextFile** creates a file in a folder and returns a stream
- [Open](../../../Core/Open) statement -- the VBA statement that opens a file for input and output
- [Line Input #](../../../Core/Line-Input) statement -- the VBA statement that reads a line from a file
- [Print #](../../../Core/Print) statement -- the VBA statement that writes text to a file
