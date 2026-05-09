---
title: Open
parent: Statements
permalink: /tB/Core/Open
---
# Open
{: .no_toc }

Enables input/output (I/O) to a file.

Syntax:
> **Open** *pathname* **For** *mode* [ **Access** *access* ] [ *lock* ] [ **Encoding** *encoding* ] **As** [ **#** ] *filenumber* [ **Len** **=** *reclength* ]

*pathname*
: String expression that specifies a file name; may include directory or folder, and drive.

*mode*
: Keyword specifying the file mode: **Append**, **Binary**, **Input**, **Output**, or **Random**. If unspecified, the file is opened for **Random** access.

*access*
: *optional*  Keyword specifying the operations permitted on the open file: **Read**, **Write**, or **Read Write**.

*lock*
: *optional*  Keyword specifying the operations restricted on the open file by other processes: **Shared**, **Lock Read**, **Lock Write**, or **Lock Read Write**.

*encoding*
: *optional*  An encoding identifier from the [**TextEncodingConstants**](../Modules/TextEncodingConstants/) module — for example **utf_8**, **utf_16**, **windows_1252_western**, or **default_system_ansi**. The IDE surfaces these constants automatically in IntelliSense after the **Encoding** keyword. Other system-supported encodings with similar identifier strings are also accepted at runtime. The **Encoding** clause applies to text-mode I/O (**Input**, **Output**, **Append**); it has no effect on **Binary** or **Random** mode files.

*filenumber*
: A valid file number in the range 1 to 511, inclusive. Use the [**FreeFile**](../Modules/FileSystem/FreeFile) function to obtain the next available file number.

*reclength*
: *optional*  Number less than or equal to 32,767 (bytes). For files opened for random access, this value is the record length. For sequential files, this value is the number of characters buffered.

You must open a file before any I/O operation can be performed on it. **Open** allocates a buffer for I/O to the file and determines the mode of access to use with the buffer.

If the file specified by *pathname* doesn't exist, it is created when a file is opened for **Append**, **Binary**, **Output**, or **Random** modes.

If the file is already opened by another process, and the specified type of access is not allowed, the **Open** operation fails and an error occurs.

The **Len** clause is ignored if *mode* is **Binary**.

> [!IMPORTANT]
> In **Binary**, **Input**, and **Random** modes, you can open a file by using a different file number without first closing the file. In **Append** and **Output** modes, you must close a file before opening it with a different file number.

> [!NOTE]
> The **Encoding** clause is a twinBASIC extension. Classic VBA has no equivalent and reads or writes text using the system ANSI code page only.

### Example

This example illustrates various uses of the **Open** statement to enable input and output to a file.

The following code opens the file in sequential-input mode.

```tb
Open "TESTFILE" For Input As #1
' Close before reopening in another mode.
Close #1
```

This example opens the file in **Binary** mode for writing operations only.

```tb
Open "TESTFILE" For Binary Access Write As #1
' Close before reopening in another mode.
Close #1
```

The following example opens the file in **Random** mode. The file contains records of the user-defined type.

```tb
Type Record ' Define user-defined type.
    ID As Integer
    Name As String * 20
End Type

Dim MyRecord As Record ' Declare variable.
Open "TESTFILE" For Random As #1 Len = Len(MyRecord)
' Close before reopening in another mode.
Close #1
```

This code example opens the file for sequential output; any process can read or write to the file.

```tb
Open "TESTFILE" For Output Shared As #1
' Close before reopening in another mode.
Close #1
```

This code example opens the file in **Binary** mode for reading; other processes can't read the file.

```tb
Open "TESTFILE" For Binary Access Read Lock Read As #1
```

This example reads a UTF-8 text file. The **Encoding** clause names the [TextEncodingConstants](../Modules/TextEncodingConstants/) constant for UTF-8.

```tb
Open "C:\MyFile.txt" For Input Encoding utf_8 As #1
' Subsequent Line Input #, Input #, etc. interpret bytes as UTF-8.
Close #1
```

### See Also

- [**Close** statement](Close)
- [**Get** statement](Get)
- [**Put** statement](Put)
- [**Input #** statement](Input)
- [**Line Input #** statement](Line-Input)
- [**Print #** statement](Print)
- [**Write #** statement](Write)
- [**Lock** / **Unlock** statements](Lock)
- [**FreeFile** function](../Modules/FileSystem/FreeFile)
- [**TextEncodingConstants** module](../Modules/TextEncodingConstants/)

{% include VBA-Attribution.md %}
