---
title: Item
parent: Dictionary
permalink: /tB/Packages/Contributed/VBA_JSON/Dictionary/Item
has_toc: false
---
# Item
{: .no_toc }

Returns or sets the value stored under a given key in the **Dictionary**.

<!-- test: DictionaryTests.Item_KeysThatDifferInCase_AreSeparateKeys, ParseJsonTests.KeysThatDifferInCase_AreSeparateEntries -->
> [!WARNING] 2.3.1.1
> Keys are compared without regard to case, so `d("a")` and `d("A")` are one entry: the second assignment replaces the first value. **ParseJson** therefore merges the keys `id` and `ID` of one JSON object into one entry that holds the last value, and the other value is lost without an error. JSON keys are case-sensitive, and so are the keys of the **Scripting.Dictionary** that VBA-JSON uses on Windows.

## Get

Returns the **Variant** value associated with *Key*.

Syntax: *object*.**Item**(*Key*)

*object*
: *required* An object expression that evaluates to a **Dictionary** object.

*Key*
: *required* A **String** identifying the entry to retrieve.

<!-- test: DictionaryTests.Item_IsTheDefaultMember, DictionaryTests.Item_MissingKey_RaisesError5 -->
**Item** is the default member of **Dictionary**, so `dict("key")` and `dict.Item("key")` are equivalent.

If *Key* does not exist in the dictionary, the underlying **Collection** raises run-time error 5 (Invalid procedure call or argument), and the key is not added.
<!-- /test -->

<!-- test: DictionaryTests.Item_MissingKey_RaisesError5, DictionaryTests.Item_MissingKey_ScriptingDictionaryAddsTheKey -->
> [!NOTE] 2.3.1.1
> Reading a key that is not there raises run-time error 5 and adds nothing. A **Scripting.Dictionary** returns **Empty** and adds the key.

## Let

Stores a non-object value under *Key*, replacing any existing entry with the same key.

Syntax: *object*.**Item**(*Key*) **=** *value*

*Key*
: A **String** identifying the entry to write.

*value*
: A **Variant** (non-object) to store under *Key*.

<!-- test: DictionaryTests.Item_Replace_KeepsOneEntryWithTheNewValue, DictionaryTests.Item_Replace_MovesTheKeyToTheEnd, DictionaryTests.Item_NumericKey_IsConvertedToAString -->
If *Key* already exists, the previous entry is removed before the new value is added, so each key maps to exactly one value. The new entry is added at the end, so a replaced key moves to the end of the enumeration order. A *Key* that is not a **String**, such as the number 5, is converted to one.
<!-- /test -->

<!-- test: DictionaryTests.Item_Replace_MovesTheKeyToTheEnd, DictionaryTests.Item_Replace_ScriptingDictionaryKeepsThePosition -->
> [!NOTE] 2.3.1.1
> Assigning to an existing key moves the entry to the end of the **For Each** and **Keys** order. A **Scripting.Dictionary** keeps the entry where it was, so code that writes a value back into a parsed object changes the order of the keys that **ConvertToJson** writes.

## Set

Stores an object reference under *Key*, replacing any existing entry with the same key.

Syntax: **Set** *object*.**Item**(*Key*) **=** *value*

*Key*
: A **String** identifying the entry to write.

*value*
: A **Variant** containing an object reference to store under *Key*.

<!-- test: DictionaryTests.Item_Set_StoresAnObjectReference, DictionaryTests.Item_Replace_KeepsOneEntryWithTheNewValue -->
The **Set** accessor has the same replacement behaviour as **Let**: if *Key* already exists, the prior entry is removed first.
<!-- /test -->

### Example

This example stores and retrieves values from a **Dictionary**.

```tb check_build
Dim dict As New Dictionary

' Store scalar values.
dict("name") = "Alice"
dict("score") = 42

' Retrieve using the default member.
Debug.Print dict("name")         ' Alice
Debug.Print dict("score")        ' 42

' Overwrite an existing key.
dict("score") = 100
Debug.Print dict.Item("score")   ' 100
```

### See Also

- [Keys](Keys) property
