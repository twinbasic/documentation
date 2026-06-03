---
title: Command
parent: Interaction Module
permalink: /tB/Modules/Interaction/Command
redirect_from:
-  /tB/Core/Command
vba_attribution: true
---
# Command, Command$
{: .no_toc }

Returns the argument portion of the command line used to launch the program.

Syntax:

- **Command$()**
- **Command()**

The `$`-suffixed form returns a **String**; the unsuffixed form returns a **Variant** (**String**).

For applications compiled to an executable, **Command** returns any arguments that appear after the name of the application on the command line. For example, with the command line:

```
MyApp /switch arg1 arg2
```

**Command** returns `"/switch arg1 arg2"`.

### Example

This example uses **Command** to retrieve the command-line arguments and split them into an array.

```tb
Function GetCommandLine(Optional MaxArgs As Variant) As Variant
    Dim Ch As String, CmdLine As String, CmdLnLen As Long
    Dim InArg As Boolean, I As Long, NumArgs As Long

    If IsMissing(MaxArgs) Then MaxArgs = 10
    ReDim ArgArray(MaxArgs)

    NumArgs = 0
    InArg = False
    CmdLine = Command()
    CmdLnLen = Len(CmdLine)

    For I = 1 To CmdLnLen
        Ch = Mid(CmdLine, I, 1)
        If Ch <> " " And Ch <> vbTab Then
            If Not InArg Then
                If NumArgs = MaxArgs Then Exit For
                NumArgs = NumArgs + 1
                InArg = True
            End If
            ArgArray(NumArgs) = ArgArray(NumArgs) & Ch
        Else
            InArg = False
        End If
    Next I

    ReDim Preserve ArgArray(NumArgs)
    GetCommandLine = ArgArray()
End Function
```

### See Also

- [Shell](Shell) function
- [Environ](Environ) function
