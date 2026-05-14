---
title: '#If, #Const'
parent: Statements
permalink: /tB/Core/Topic-Preprocessor
vba_attribution: true
---
# #If...Then...#Else, #Const directives
{: .no_toc }

Compiler directives that conditionally include or exclude blocks of code at *compile time*, and define the constants those conditions are tested against. Unlike runtime [**If...Then...Else**](If-Then-Else) and [**Const**](Const), the directives operate during compilation: code in an inactive branch is omitted entirely from the compiled output and contributes no size or runtime cost.

## #If...Then...#Else directive

Syntax:

> **#If** *expression* **Then**  
> &nbsp;&nbsp;&nbsp;&nbsp;*statements*  
> [ **#ElseIf** *expression-n* **Then**  
> &nbsp;&nbsp;&nbsp;&nbsp;[ *elseifstatements* ] ] ...  
> [ **#Else**  
> &nbsp;&nbsp;&nbsp;&nbsp;[ *elsestatements* ] ]  
> **#End If**

*expression*, *expression-n*
: An expression composed exclusively of conditional compiler constants, literals, and operators, evaluating to **True** or **False**.

*statements*, *elseifstatements*, *elsestatements*
: Source lines or further compiler directives included when the corresponding *expression* is **True**.

The directive's behaviour mirrors the runtime [**If...Then...Else**](If-Then-Else) statement, with the following differences:

- There is no single-line form --- `#If`, `#ElseIf`, `#Else`, and `#End If` must each appear on their own line.
- All *expressions* are evaluated regardless of which branch is selected, so every constant they reference must be defined. Undefined conditional compiler constants evaluate as **Empty** (i.e. zero), which is treated as **False**.
- Code in unselected branches is *removed* from the compilation rather than skipped at runtime. In twinBASIC, inactive code is not even checked for errors. The IDE greys out inactive blocks based on the current build configuration.

> [!NOTE]
> The [**Option Compare**](Option) statement does not affect expressions in `#If`/`#ElseIf`. They are always evaluated as if **Option Compare Text** were in effect.

## #Const directive

Syntax:

> **#Const** *constname* **=** *expression*

*constname*
: Name of the conditional compiler constant; follows standard variable naming conventions.

*expression*
: A literal, another conditional compiler constant, or any combination using arithmetic or logical operators (except [**Is**](Is)). Standard runtime constants (declared with [**Const**](Const)) are *not* allowed here.

Conditional compiler constants declared with `#Const` are private to the module in which they appear. Project-wide conditional constants must be defined in the project's compilation settings --- `#Const` cannot create them.

Conditional compiler constants are always evaluated at the module level regardless of where they appear in code; they can only be used in `#If`/`#ElseIf` expressions.

## Predefined compiler constants

twinBASIC provides a set of built-in compiler constants --- `Win64`, `Win32`, `TWINBASIC`, `TWINBASIC_BUILD`, `VBA7`, etc. See the dedicated [Compiler Constants](../../Reference/Compiler-Constants) page for the full list and what each one means.

### Example

This example uses the `Win64` predefined constant to select platform-specific imports, and a project-defined `DEBUG_BUILD` constant to enable extra logging only in debug builds.

```tb
#Const DEBUG_BUILD = 1

#If Win64 Then
    ' 64-bit-only declarations.
    Import Library "/Miscellaneous/sqlite3_64.obj" As SQLITE3
#Else
    ' 32-bit fallback.
    Import Library "/Miscellaneous/sqlite3_32.obj" As SQLITE3
#End If

Public Sub DoWork()
#If DEBUG_BUILD Then
    Debug.Print "Entering DoWork at "; Now
#End If
    ' ...
End Sub
```

### See Also

- [**If...Then...Else** statement](If-Then-Else) -- the runtime counterpart.
- [**Const** statement](Const) -- the runtime counterpart of **#Const**.
- [Compiler Constants](../../Reference/Compiler-Constants) -- the full list of built-in conditional constants.
