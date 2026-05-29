---
title: CodeLens
parent: Compiler and IDE Features
nav_order: 3
---

# Run Subs from the IDE

The CodeLens feature allows running Subs and Functions, with no arguments and in modules (but not classes/Forms/UserControls) right from the editor without starting the full program. It has full access to your code; it can access constants, call other functions both intrinsic and user-defined, call APIs, and print to the Debug Console.

Methods eligible to run with CodeLens (when enabled), have a bar above them that you can click to run:

![image](../Images/351d0147-cad3-4e16-89e5-0a9e43496740.png)

### Example

A no-argument `Public Sub` in a module is eligible for CodeLens:

```tb
Public Sub RunTest()
    Debug.Print "Hello from CodeLens"
End Sub
```
