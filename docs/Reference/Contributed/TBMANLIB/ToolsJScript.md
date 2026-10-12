---
title: ToolsJScript
parent: TBMANLIB Package
permalink: /tB/Packages/Contributed/TBMANLIB/ToolsJScript
has_toc: false
---

# ToolsJScript module
{: .no_toc }

Is meant to create JavaScript arrays and objects with the Microsoft Script Control, so that a program can hand them to code that expects one. The module has two functions. [**ToolsDic.ToWwwFormUrlencoded**](ToolsDic#towwwformurlencoded) is the one place in the package that uses it.

> [!NOTE]
> In version 1.0.0.5 both functions raise error 91, *Object variable or With block variable not set*, in a 32-bit program. The module creates the Script Control with `Dim MSSC As New MSScriptControl.ScriptControl`. In BETA 1005 that statement creates no usable object, in the package and also in a program that references the Script Control itself: a variable declared with the type **ScriptControl** cannot hold the control, so `Set` raises error -2147467262, *No such interface supported*, and every member used on a `Dim ... As New` variable raises error 91. A variable declared **As Object**, or **As MSScriptControl.IScriptControl**, holds the control, so `CreateObject("MSScriptControl.ScriptControl")` works with either. VB6 creates the control with `As New`, with `Set` and with `CreateObject`, for a variable of any of these types. The same happens with the classes of other ActiveX controls, such as the Winsock and Common Dialog controls.
>
> The Script Control exists only as a 32-bit component. A project that embeds the package cannot be built for 64-bit programs at all; see [32-bit and 64-bit programs](.#32-bit-and-64-bit-programs).

```tb check_build check_run
Dim Arr As Object
On Error Resume Next
Set Arr = ToolsJScript.NewArr()
Debug.Print Err.Number & " " & Err.Description
Err.Clear
Set Arr = ToolsJScript.NewObj()
Debug.Print Err.Number
' Output:
' 91 Object variable or With block variable not set
' 91
```

What the module is meant to do is this. It creates one Script Control, shared by all callers, the first time one of its functions is called. It selects the language JScript and adds four methods to the built-in objects of the engine: `get_(x)` on every object and on every array, `has_(x)` on every object (**True** when the object has its own property named *x*), `Push(x)` on arrays, which calls the array's own `push`, and `Join(x)` on arrays, which calls `join`. The comments in the source say that `Push` and `Join` exist because the code editor changes the case of the names `push` and `join` that it knows, and that the two names with an underscore are slower than reading a property directly. The text of `Join` has no `return`, so `Join(x)` returns nothing; the array's own `join`, in lower case, returns the joined text.

A program that needs a JavaScript array can create the control itself:

```tb check_build check_run
Dim SC As Object
Dim Arr As Object
Set SC = CreateObject("MSScriptControl.ScriptControl")
SC.Language = "JScript"

Set Arr = SC.Eval("[]")
Arr.push "x"
Arr.push "y"
Debug.Print Arr.length
Debug.Print Arr.join(",")
' Output:
' 2
' x,y
```

## Functions

### NewArr
{: .no_toc }

Is meant to create an empty JavaScript array.

Syntax: **ToolsJScript.NewArr** ( [ *Item* ] ) **As Object**

*Item*
: *optional* Any number of values. They are accepted and ignored: the array would be empty whatever is passed.

The function evaluates `[];` in the Script Control and returns the array. In version 1.0.0.5 it raises error 91 instead, as the note above says.

### NewObj
{: .no_toc }

Is meant to create an empty JavaScript object.

Syntax: **ToolsJScript.NewObj** ( ) **As Object**

The function evaluates `{};` and assigns the result to **NewArr**, the name of the other function, and not to its own result. In version 1.0.0.5 it raises error 91, as **NewArr** does. It would not work if the control existed: JScript reads `{};` as an empty block, not as an object, so a Script Control that evaluates `{};` returns no object, and the statement that uses the result fails with error 424, *Object required*. The text `({})` evaluates to an object.

## See Also

- [ToolsDic](ToolsDic) module -- **ToWwwFormUrlencoded** builds on **NewArr**
- [TBMANLIB](.) package -- overview
