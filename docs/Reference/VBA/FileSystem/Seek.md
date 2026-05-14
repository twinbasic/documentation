---
title: Seek
parent: FileSystem Module
permalink: /tB/Modules/FileSystem/Seek
redirect_from:
-  /tB/Core/Seek
vba_attribution: true
---
# Seek
{: .no_toc }

Returns or sets the read/write position within a file opened by using the **Open** statement.

## Seek Function

Returns a **Long** specifying the current read/write position within an open file.

Syntax: **Seek(** *filenumber* **)**

*filenumber*
: *required* **Integer** containing a valid file number.

**Seek** returns a value between 1 and 2,147,483,647 (2^31 − 1), inclusive.

| Mode                                          | Return value                                                                                      |
|-----------------------------------------------|---------------------------------------------------------------------------------------------------|
| **Random**                                    | Number of the next record to be read or written.                                                  |
| **Binary**, **Output**, **Append**, **Input** | Byte position at which the next operation takes place. The first byte in a file is at position 1. |

## Seek Statement

Sets the position for the next read/write operation within an open file.

Syntax: **Seek** [ **#** ] *filenumber*, *position*

*filenumber*
: *required* Any valid file number.

*position*
: *required* Number in the range 1--2,147,483,647 indicating where the next read/write operation should occur.

Record numbers specified in [Get](../../Core/Get) and [Put](../../Core/Put) statements override file positioning performed by **Seek**.

Performing a file-write operation after a **Seek** operation beyond the end of a file extends the file. Attempting a **Seek** to a negative or zero position causes an error.

### Examples

This example assumes that `TESTFILE` contains records of the user-defined type `Record`.

```tb
Type Record    ' Define user-defined type.
    ID As Integer
    Name As String * 20
End Type
```

For files opened in **Random** mode, the **Seek** function returns the number of the next record.

```tb
Dim MyRecord As Record
Open "TESTFILE" For Random As #1 Len = Len(MyRecord)
Do While Not EOF(1)    ' Loop until end of file.
    Get #1, , MyRecord    ' Read next record.
    Debug.Print Seek(1)    ' Print record number.
Loop
Close #1    ' Close file.
```

The **Seek** statement can set the record position. This example reads records in reverse order.

```tb
Dim MyRecord As Record, MaxSize, RecordNumber
Open "TESTFILE" For Random As #1 Len = Len(MyRecord)
MaxSize = LOF(1) \ Len(MyRecord)    ' Get number of records in file.
For RecordNumber = MaxSize To 1 Step -1
    Seek #1, RecordNumber    ' Set position.
    Get #1, , MyRecord    ' Read record.
Next RecordNumber
Close #1    ' Close file.
```

For files opened in modes other than **Random**, **Seek** returns or sets the byte position.

```tb
Dim MyChar
Open "TESTFILE" For Input As #1    ' Open file for reading.
Do While Not EOF(1)    ' Loop until end of file.
    MyChar = Input(1, #1)    ' Read next character.
    Debug.Print Seek(1)    ' Print byte position.
Loop
Close #1    ' Close file.
```

### See Also

- [Loc](Loc) function
- [LOF](LOF) function
- [EOF](EOF) function
