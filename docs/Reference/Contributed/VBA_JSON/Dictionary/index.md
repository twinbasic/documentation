---
title: Dictionary
parent: VBA_JSON Package
permalink: /tB/Packages/Contributed/VBA_JSON/Dictionary/
has_toc: false
---

# Dictionary class
{: .no_toc }

A string-keyed collection that maps **String** keys to **Variant** values, backed by a twinBASIC **Collection**.

**Dictionary** is the object type returned by the JSON parser when a JSON object is decoded. Keys are strings, compared as the backing **Collection** compares its keys; **Dictionary** does not change that. Values can be any **Variant**---numbers, strings, **Boolean**, **Null** (for JSON `null`), or nested **Dictionary** and **Collection** objects (a JSON array becomes a **Collection**).

```tb check_build
Dim d As New Dictionary

d("name") = "Alice"
d("age") = 30

Debug.Print d("name")   ' Alice
Debug.Print d("age")    ' 30
```

* TOC
{:toc}

## Properties

### Item
{: .no_toc }

Returns or sets the value stored under a given key. **(Default member.)**

Syntax: *object* ( *Key* ) [ = *Value* ]

Syntax (explicit): *object*.**Item** ( *Key* ) [ = *Value* ]

*Key*
: *required* A **String** identifying the entry.

*Value*
: A **Variant** to store. When assigning an object reference, use **Set** *object*(**Key**) = *Value*.

Reading a key that does not exist raises run-time error 5 (Invalid procedure call or argument), inherited from the underlying **Collection**.

Because **Item** is the default member, the parenthesized shorthand *object*(*Key*) is equivalent to *object*.**Item**(*Key*).

```tb check_build
Dim d As New Dictionary

' Scalar value --- Property Let
d("count") = 42

' Object reference --- Property Set
Dim child As New Dictionary
Set d("child") = child

Debug.Print d("count")       ' 42
Debug.Print TypeName(d("child"))  ' Dictionary
```

### Keys
{: .no_toc }

Returns the keys of all entries as a **Variant** array.

Syntax: *object*.**Keys**

The return value is a **Variant** holding the **String** array that the underlying **Collection.Keys** property produces: one element per key, in the order the entries were added. When the collection is empty, an empty array is returned.

```tb check_build
Dim d As New Dictionary
d("x") = 1
d("y") = 2

Dim k As Variant
For Each k In d.Keys
    Debug.Print k & " = " & d(k)
Next
```

**Item** takes its key `ByVal` as a **String**, so a key held in a **Variant**, such as the loop variable of a **For Each** over **Keys**, is converted to a **String** when it is passed.

## Remarks

**Dictionary** supports **For Each** iteration through the `[Enumerator]` attribute on its private `_NewEnum` function, which delegates to the backing **Collection**'s enumerator. Iterating with **For Each** yields the stored *values* (not keys):

```tb check_build
Dim d As New Dictionary
d("a") = 10
d("b") = 20

Dim v As Variant
For Each v In d
    Debug.Print v   ' prints 10, then 20
Next v
```

To iterate over keys, use [**Keys**](#keys) instead.

Assigning to an existing key replaces the current value: **Item Let/Set** removes the old entry via **Collection.Remove** and re-adds the new value under the same key. The re-added entry goes to the end, so it moves to the end of the **For Each** and **Keys** order.

**Dictionary** has only the **Item** and **Keys** members: it has no **Count**, **Exists**, **Add** or **Remove**. To count entries, take the bounds of **Keys** with **UBound** and **LBound**:

```tb check_build
Dim d As New Dictionary
d("x") = 1
d("y") = 2

Dim keyCount As Long
keyCount = UBound(d.Keys) - LBound(d.Keys) + 1   ' 2
```

## Example

This example parses a JSON string and reads values from the resulting **Dictionary**.

```tb check_build
' Assumes JsonConverter (VBA_JSON) is referenced and ParseJson is in scope.
Dim parsed As Dictionary
Set parsed = JsonConverter.ParseJson("{""name"":""Bob"",""score"":95}")

Debug.Print parsed("name")    ' Bob
Debug.Print parsed("score")   ' 95

Dim k As Variant
For Each k In parsed.Keys
    Debug.Print k & ": " & parsed(k)
Next
```

## See Also

- [VBA_JSON](../) package -- overview, **ParseJson** function, and **ConvertToJson** function
