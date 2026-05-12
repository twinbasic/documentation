---
title: Add
parent: Collection Module
permalink: /tB/Modules/Collection/Add
vba_attribution: true
---
# Add
{: .no_toc }

Adds a member to a **Collection** object.

Syntax: *object*.**Add** *item* [ **,** *key* ] [ **,** *before* ] [ **,** *after* ]

*object*
: *required* An object expression that evaluates to a **Collection** object.

*item*
: *required* An expression of any type that specifies the member to add to the collection.

*key*
: *optional* A unique string expression that specifies a key string that can be used, instead of a positional index, to access a member of the collection.

*before*
: *optional* An expression that specifies a relative position in the collection. The member to be added is placed in the collection before the member identified by the *before* argument. If a numeric expression, *before* must be a number from 1 to the value of the collection's [**Count**](Count) property. If a string expression, *before* must correspond to the *key* specified when the member being referred to was added to the collection. You can specify a *before* position or an *after* position, but not both.

*after*
: *optional* An expression that specifies a relative position in the collection. The member to be added is placed in the collection after the member identified by the *after* argument. The same numeric and string-key constraints as *before* apply. You can specify a *before* position or an *after* position, but not both.

If neither *before* nor *after* is specified, the new item is added at the end of the collection.

Whether *before* or *after* is a string expression or a numeric expression, it must refer to an existing member of the collection, or an error occurs.

An error also occurs if a specified *key* duplicates the *key* for an existing member of the collection. Key comparison is governed by the [**KeyCompareMode**](KeyCompareMode) property.

### Example

This example uses the **Add** method to add `Inst` objects (instances of a class called `Class1` containing a **Public** variable `InstanceName`) to a collection called `MyClasses`. To run this code, insert a class module and declare a public variable called `InstanceName` at module level of `Class1` (type `Public InstanceName`) to hold the names of each instance. Leave the default name as `Class1`.

```tb
Dim MyClasses As New Collection    ' Create a Collection object.
Dim Num As Integer                 ' Counter for individualizing keys.
Dim Msg As String
Dim TheName As Variant             ' Holder for names user enters.
Do
    Dim Inst As New Class1         ' Create a new instance of Class1.
    Num = Num + 1                  ' Increment Num, then get a name.
    Msg = "Please enter a name for this object." & vbNewLine _
        & "Press Cancel to see names in collection."
    TheName = InputBox(Msg, "Name the Collection Items")
    Inst.InstanceName = TheName    ' Put name in object instance.
    ' If user entered name, add it to the collection.
    If Inst.InstanceName <> "" Then
        ' Add the named object to the collection.
        MyClasses.Add Item := Inst, Key := CStr(Num)
    End If
    ' Clear the current reference in preparation for next one.
    Set Inst = Nothing
Loop Until TheName = ""
Dim x As Variant
For Each x In MyClasses
    MsgBox x.InstanceName, , "Instance Name"
Next
```

### See Also

- [Count](Count) property
- [Item](Item) method
- [Remove](Remove) method
- [Exists](Exists) method
