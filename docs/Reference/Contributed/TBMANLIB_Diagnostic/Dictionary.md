---
title: TBMANLIB_Diagnostic Dictionary
parent: TBMANLIB_Diagnostic Package
permalink: /tB/Packages/Contributed/TBMANLIB_Diagnostic/Dictionary
has_toc: false
---

# Dictionary class
{: .no_toc }

A collection of values that are found by a key. It is a generic class, **Dictionary(Of TKey, TValue)**, and is not the **Dictionary** of the Scripting Runtime. It keeps the keys in one [**List**](List) and the values in another, in the order in which they were added, and finds a key by looking at the keys one after the other, so it is meant for a few dozen items and not a large number. Nothing else in the package uses it.

**In version 0.0.0.0 a dictionary cannot be created.** The constructor assigns the two lists to its fields without **Set**, and `New Dictionary(Of TKey, TValue)` raises run-time error 91, *Object variable or With block variable not set*. The variable keeps the value **Nothing**, so every member fails as well. See [Known problems](.#known-problems-in-version-0000).

```tb check_build check_run
Dim ages As Dictionary(Of String, Long)
On Error Resume Next
Set ages = New Dictionary(Of String, Long)
Debug.Print Err.Number & ": " & Err.Description
Err.Clear

Debug.Print ages Is Nothing
ages.Add "Ann", 31
Debug.Print Err.Number
' Output:
' 91: Object variable or With block variable not set
' True
' 91
```

The rest of this page describes the members as the source declares them. **Item** is a function, so a value would be read as `ages.Item("Bob")`. The class has no default member and no enumerator: there is no `ages("Bob")`, a value is set with [**SetItem**](#setitem), and the keys are visited with an index loop over [**Keys**](#keys). The keys are compared with the `=` operator.

The name `Dictionary` is also the name of the class of the Scripting Runtime; see [Using the package with the Scripting Runtime](.#using-the-package-with-the-scripting-runtime). A program that needs a dictionary can use that class.

* TOC
{:toc}

## Properties

### Count
{: .no_toc }

The number of keys.

Syntax: *dictionary*.**Count** **As Long**

Read-only.

### Keys
{: .no_toc }

The keys, in the order in which they were added.

Syntax: *dictionary*.**Keys** **As List(Of TKey)**

Read-only. The property returns the list that the dictionary uses, not a copy. Changing the list directly, with **Add**, **Remove** or **Clear**, leaves the values as they were, and then the keys and the values no longer match.

### Values
{: .no_toc }

The values, in the order of the keys.

Syntax: *dictionary*.**Values** **As List(Of TValue)**

Read-only. The same remark as for [**Keys**](#keys) applies. The value at an index of this list belongs to the key at the same index of **Keys**.

## Methods

### Add
{: .no_toc }

Adds a key and a value.

Syntax: *dictionary*.**Add** ( *key*, *value* )

*key*
: *required* A value of type *TKey*. The key must not be there already.

*value*
: *required* A value of type *TValue*.

### Clear
{: .no_toc }

Removes all keys and values.

Syntax: *dictionary*.**Clear**

### ContainsKey
{: .no_toc }

Tests whether a key is there.

Syntax: *dictionary*.**ContainsKey** ( *key* ) **As Boolean**

*key*
: *required* A value of type *TKey*.

### Item
{: .no_toc }

Returns the value of a key.

Syntax: *dictionary*.**Item** ( *key* ) **As TValue**

*key*
: *required* A value of type *TKey*. The key must be there. [**TryGetValue**](#trygetvalue) does not need that.

### New
{: .no_toc }

Creates an empty dictionary.

Syntax: **New** **Dictionary(Of TKey, TValue)**

In version 0.0.0.0 it raises run-time error 91: see the start of this page.

### Remove
{: .no_toc }

Removes a key and its value.

Syntax: *dictionary*.**Remove** ( *key* ) **As Boolean**

*key*
: *required* A value of type *TKey*.

Returns **True** when the key was there and is removed, and **False** when it was not. The keys after it move down by one place.

### SetItem
{: .no_toc }

Sets the value of a key, and adds the key if it is new.

Syntax: *dictionary*.**SetItem** ( *key*, *value* )

*key*
: *required* A value of type *TKey*.

*value*
: *required* A value of type *TValue*.

Replaces the value of a key that is there, and keeps its place. A key that is not there goes to the end.

### TryGetValue
{: .no_toc }

Reads the value of a key when the key is there.

Syntax: *dictionary*.**TryGetValue** ( *key*, *value* ) **As Boolean**

*key*
: *required* A value of type *TKey*.

*value*
: *required* A variable of type *TValue*, passed **ByRef**. It receives the value when the key is there, and is not changed when it is not.

Returns **True** when the key was there.

## See Also

- [List](List) class -- holds the keys and the values
- [KeyValuePair](KeyValuePair) class -- one key with one value
- [Using the package with the Scripting Runtime](.#using-the-package-with-the-scripting-runtime) -- which **Dictionary** a name means
