---
title: Item
parent: Dictionary
permalink: /tB/Packages/Contributed/VBA_JSON/Dictionary/Item
has_toc: false
---
# Item
{: .no_toc }

Returns or sets the value stored under a given key in the **Dictionary**.

## Get

Returns the **Variant** value associated with *Key*.

Syntax: *object*.**Item**(*Key*)

*object*
: *required* An object expression that evaluates to a **Dictionary** object.

*Key*
: *required* A **String** identifying the entry to retrieve.

**Item** is the default member of **Dictionary**, so `dict("key")` and `dict.Item("key")` are equivalent.

If *Key* does not exist in the dictionary, a runtime error is raised by the underlying **Collection**.

## Let

Stores a non-object value under *Key*, replacing any existing entry with the same key.

Syntax: *object*.**Item**(*Key*) **=** *value*

*Key*
: A **String** identifying the entry to write.

*value*
: A **Variant** (non-object) to store under *Key*.

If *Key* already exists, the previous entry is removed before the new value is added, so each key maps to exactly one value. The new entry is added at the end, so a replaced key moves to the end of the enumeration order.

## Set

Stores an object reference under *Key*, replacing any existing entry with the same key.

Syntax: **Set** *object*.**Item**(*Key*) **=** *value*

*Key*
: A **String** identifying the entry to write.

*value*
: A **Variant** containing an object reference to store under *Key*.

The **Set** accessor has the same replacement behaviour as **Let**: if *Key* already exists, the prior entry is removed first.

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
