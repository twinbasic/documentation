---
title: ToolsDic
parent: TBMANLIB Package
permalink: /tB/Packages/Contributed/TBMANLIB/ToolsDic
has_toc: false
---

# ToolsDic module
{: .no_toc }

Helpers for **Scripting.Dictionary** objects: reading and writing the `name=value&name=value` text of web forms, setting a value two levels deep, merging one dictionary into another, and copying one. A dictionary is passed as a `Scripting.Dictionary` parameter, so a program that names the type in its own code references the Microsoft Scripting Runtime.

```tb check_build check_run
Dim Form As New Scripting.Dictionary
Debug.Print ToolsDic.FromWwwFormUrlencoded("name=Ann&city=Oslo&empty=&x= y ", Form)
Debug.Print Form("name") & "|" & Form("city") & "|" & Form("empty") & "|" & Form("x")
' Output:
' True
' Ann|Oslo||y
```

* TOC
{:toc}

## Functions

### DeepCopy
{: .no_toc }

Copies a dictionary.

Syntax: **ToolsDic.DeepCopy** ( *srcDic* ) **As Scripting.Dictionary**

*srcDic*
: *required* A **Scripting.Dictionary**. It is not changed.

Returns a new dictionary with the same keys and values. Only the first level is copied: where a value is an object, such as a dictionary or a collection, the copy holds the same object, not a copy of it. The source says that a recursive copy is still to be written. The copy has the default comparison mode, whatever the mode of the source.

```tb check_build check_run
Dim A As New Scripting.Dictionary
Dim C As Scripting.Dictionary

Set A("child") = New Scripting.Dictionary
A("child")("n") = 1

Set C = ToolsDic.DeepCopy(A)
C("child")("n") = 2
Debug.Print A("child")("n")
' Output:
' 2
```

### FromWwwFormUrlencoded
{: .no_toc }

Reads the pairs of a `name=value&name=value` text into a dictionary.

Syntax: **ToolsDic.FromWwwFormUrlencoded** ( *Content* **,** *Dic* ) **As Boolean**

*Content*
: *required* A **String**, the text. It is split at each `&`, and each piece is split at its first `=`.

*Dic*
: *required* A **Scripting.Dictionary** that receives the pairs. A name that it already holds gets the new value, and the other entries stay.

The name and the value of each pair lose the spaces at their ends. A pair with an empty name is skipped. A pair with no `=` gets an empty value. A value that holds an `=` is cut at it: in `a=b=c` the value is `b`. The text is not percent-decoded, so `%20` and `+` stay as written, and a value that holds `&` cannot be expressed. The function always returns **True**. The source says that values that are arrays are still to be handled.

### OverWrite
{: .no_toc }

Copies values from one dictionary into another.

Syntax: **ToolsDic.OverWrite** ( *DistDic* **,** *srcDic* [ **,** *OnlyKey* ] )

*DistDic*
: *required* A **Scripting.Dictionary**, the one that receives the values.

*srcDic*
: *required* A **Scripting.Dictionary**, the one that supplies them. It is not changed.

*OnlyKey*
: *optional* A **Boolean**, **True** by default. When it is **True**, only the keys that *DistDic* already has are written, so the structure of *DistDic* stays as it is. When it is **False**, every key of *srcDic* is written, and the missing ones are added.

Where a value of *srcDic* is an object, the method calls itself for that key with the two objects, so the nested dictionary of *DistDic* is updated in place and not replaced. A value that is not an object is assigned.

> [!NOTE]
> With *OnlyKey* set to **False**, a nested dictionary of *srcDic* whose key *DistDic* does not have makes the recursive call receive an empty value for the missing key, where it needs a dictionary. The call raises error 424, *Object required*, and *DistDic* keeps the key that was looked up, with the value **Empty**.

```tb check_build check_run
Dim A As New Scripting.Dictionary
Dim B As New Scripting.Dictionary
Dim Inner As Scripting.Dictionary

Set A("n") = New Scripting.Dictionary
A("n")("x") = 1
A("n")("y") = 2
Set Inner = A("n")
Set B("n") = New Scripting.Dictionary
B("n")("y") = 20
B("n")("z") = 30
ToolsDic.OverWrite A, B
Debug.Print Inner("y") & " " & Inner.Exists("z")

Set B("m") = New Scripting.Dictionary
On Error Resume Next
ToolsDic.OverWrite A, B, False
Debug.Print Err.Number
Debug.Print A.Exists("m") & " " & IsEmpty(A("m"))
' Output:
' 20 False
' 424
' True True
```

```tb check_build check_run
Dim A As New Scripting.Dictionary
Dim B As New Scripting.Dictionary
A("x") = 1
A("y") = 2
B("y") = 20
B("z") = 30

ToolsDic.OverWrite A, B
Debug.Print A("x") & " " & A("y") & " " & A.Exists("z")

ToolsDic.OverWrite A, B, False
Debug.Print A("z")
' Output:
' 1 20 False
' 30
```

### ToWwwFormUrlencoded
{: .no_toc }

Writes a dictionary as a `name=value&name=value` text.

Syntax: **ToolsDic.ToWwwFormUrlencoded** ( *Dic* ) **As String**

*Dic*
: *required* A **Scripting.Dictionary** of names and simple values.

The function is meant to build the text in a JavaScript array made with [**ToolsJScript.NewArr**](ToolsJScript#newarr), and to turn the array into text with `&` in place of the commas. The values would not be percent-encoded, and a comma in a name or in a value would become `&`.

> [!WARNING]
> In version 1.0.0.5 the function never returns a text. It adds the entries `a` with the value 1 and `bbb` with the value 2 to *Dic*, and then fails with error 91, *Object variable or With block variable not set*, because [**ToolsJScript.NewArr**](ToolsJScript#newarr) cannot create its array. The two entries stay in the dictionary. A second call with the same dictionary fails earlier, with error 457, because the keys `a` and `bbb` are already there.

```tb check_build check_run
Dim Form As New Scripting.Dictionary
Form("name") = "Ann"

On Error Resume Next
Debug.Print ToolsDic.ToWwwFormUrlencoded(Form)
Debug.Print Err.Number
Err.Clear
Debug.Print Form.Count

Debug.Print ToolsDic.ToWwwFormUrlencoded(Form)
Debug.Print Err.Number
' Output:
' 91
' 3
' 457
```

### TowLevelDicAssign
{: .no_toc }

Sets a value in a dictionary that is held in a dictionary.

Syntax: **ToolsDic.TowLevelDicAssign** ( *Dic* **,** *Lv1Name* **,** *Lv2Name* **,** *Value* )

*Dic*
: *required* A **Scripting.Dictionary** whose values are dictionaries.

*Lv1Name*
: *required* A **String**, the key in *Dic* of the inner dictionary. The inner dictionary is created if *Dic* has no such key.

*Lv2Name*
: *required* A **String**, the key in the inner dictionary.

*Value*
: *required* A **Variant**, the value to store under *Lv2Name*.

The name has *Tow* for *Two*. If the inner dictionary exists, the value replaces the value of *Lv2Name*, or adds it. If it does not, a new dictionary is made, it receives the value, and *Dic* receives the new dictionary.

```tb check_build check_run
Dim D As New Scripting.Dictionary
ToolsDic.TowLevelDicAssign D, "a", "x", 1
ToolsDic.TowLevelDicAssign D, "a", "y", 2
Debug.Print D("a")("x") + D("a")("y")
Debug.Print D("a").Count
' Output:
' 3
' 2
```

## See Also

- [ToolsJScript](ToolsJScript) module -- the JavaScript array that **ToWwwFormUrlencoded** uses
- [cJson](cJson) class -- keeps a JSON document in dictionaries
- [TBMANLIB](.) package -- overview
