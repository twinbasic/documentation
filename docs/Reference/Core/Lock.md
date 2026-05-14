---
title: Lock, Unlock
parent: Statements
permalink: /tB/Core/Lock
vba_attribution: true
---
# Lock, Unlock
{: .no_toc }

Controls access by other processes to all or part of a file opened with the [**Open**](Open) statement.

Syntax:
- > **Lock** [ **#** ] *filenumber* **,** [ *recordrange* ]
- > **Unlock** [ **#** ] *filenumber* **,** [ *recordrange* ]

*filenumber*
: Any valid file number.

*recordrange*
: *optional* The range of records to lock or unlock. The *recordrange* settings are:

  > *recnumber* \| [ *start* ] **To** *end*

  *recnumber*
  : Record number (**Random** mode files) or byte number (**Binary** mode files) at which locking or unlocking begins.

  *start*
  : Number of the first record or byte to lock or unlock.

  *end*
  : Number of the last record or byte to lock or unlock.

The **Lock** and **Unlock** statements are used in environments where several processes might need access to the same file.

**Lock** and **Unlock** statements are always used in pairs. The arguments to **Lock** and **Unlock** must match exactly.

The first record or byte in a file is at position 1, the second record or byte is at position 2, and so on. When just one record is specified, only that record is locked or unlocked. When a range of records is specified and a starting record (*start*) is omitted, all records from the first record to the end of the range (*end*) are locked or unlocked. Using **Lock** without *recnumber* locks the entire file; using **Unlock** without *recnumber* unlocks the entire file.

If the file has been opened for sequential input or output, **Lock** and **Unlock** affect the entire file, regardless of the range specified by *start* and *end*.

> [!IMPORTANT]
> Be sure to remove all locks with an **Unlock** statement before closing a file or quitting the program. Failure to remove locks produces unpredictable results.

### Example

This example illustrates the use of the **Lock** and **Unlock** statements. While a record is being modified, access by other processes to the record is denied. This example assumes that `TESTFILE` is a file containing five records of the user-defined type `Record`.

```tb
Type Record    ' Define user-defined type.
    ID As Integer
    Name As String * 20
End Type

Dim MyRecord As Record, RecordNumber    ' Declare variables.
' Open sample file for random access.
Open "TESTFILE" For Random Shared As #1 Len = Len(MyRecord)
RecordNumber = 4    ' Define record number.
Lock #1, RecordNumber    ' Lock record.
Get #1, RecordNumber, MyRecord    ' Read record.
MyRecord.ID = 234    ' Modify record.
MyRecord.Name = "John Smith"
Put #1, RecordNumber, MyRecord    ' Write modified record.
Unlock #1, RecordNumber    ' Unlock current record.
Close #1    ' Close file.
```

### See Also

- [**Open** statement](Open)
- [**Close** statement](Close)
- [**Get** statement](Get)
- [**Put** statement](Put)
