---
title: Resume
parent: Statements
permalink: /tB/Core/Resume
vba_attribution: true
---
# Resume
{: .no_toc }

Resumes execution after an error-handling routine is finished.

Syntax:
- > **Resume** [ **0** ]
- > **Resume Next**
- > **Resume** *line*

**Resume**
: If the error occurred in the same procedure as the error handler, execution resumes with the statement that caused the error. If the error occurred in a called procedure, execution resumes at the statement that last called out of the procedure containing the error-handling routine. **Resume** and **Resume 0** are equivalent.

**Resume Next**
: If the error occurred in the same procedure as the error handler, execution resumes with the statement immediately following the statement that caused the error. If the error occurred in a called procedure, execution resumes with the statement immediately following the statement that last called out of the procedure containing the error-handling routine (or the [**On Error Resume Next**](On-Error) statement).

**Resume** *line*
: Execution resumes at the *line* specified. The *line* argument is a line label or line number, and must be in the same procedure as the error handler.

Using a **Resume** statement anywhere except in an error-handling routine raises an error.

### Example

This example uses the **Resume** statement to end error handling in a procedure, and then resume execution with the statement that caused the error. Error number 55 is generated to illustrate using the **Resume** statement.

```tb
Sub ResumeStatementDemo()
    On Error GoTo ErrorHandler ' Enable error-handling routine.
    Open "TESTFILE" For Output As #1 ' Open file for output.
    Kill "TESTFILE" ' Attempt to delete open file.
    Exit Sub ' Exit Sub to avoid error handler.
ErrorHandler: ' Error-handling routine.
    Select Case Err.Number ' Evaluate error number.
        Case 55 ' "File already open" error.
            Close #1 ' Close open file.
        Case Else
            ' Handle other situations here....
    End Select
    Resume ' Resume execution at same line that caused the error.
End Sub
```

### See Also

- [**On Error** statement](On-Error)
- [**Error** statement](Error)
- [**GoTo** statement](GoTo)
