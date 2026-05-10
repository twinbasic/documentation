---
title: DataMembers Module
parent: VBRUN Package
permalink: /tB/Packages/VBRUN/DataMembers/
redirect_from:
  - /tB/Modules/DataMembers
has_toc: false
---

# DataMembers module

The **DataMembers** object is a collection of names that a data source class advertises at design time, so that a consumer binding to the data source can choose which member to bind to. Each entry is a **String** — the name of a data member the source can supply on request. The data source manages the list directly with [**Add**](#add), [**Remove**](#remove), and [**Clear**](#clear); the design-time environment reads it back through [**Count**](#count), [**Item**](#item), and **For Each** iteration to populate the data member picker.

```tb
' Inside a class whose DataSourceBehavior is set to make it a data source.
Private Sub Class_Initialize()
    UserControl.DataMembers.Add "Customers"
    UserControl.DataMembers.Add "Orders"
    UserControl.DataMembers.Add "Invoices"
End Sub
```

## Members

### Add

Adds a data member name to the collection.

Syntax: *object*.**Add** *DataMember*

*object*
: *required* An object expression that evaluates to a **DataMembers** object.

*DataMember*
: *required* A **String** giving the name of the data member to add. Names are usually presented to the consumer verbatim, so they should be readable identifiers.

### Clear

Removes every entry from the collection.

Syntax: *object*.**Clear**

*object*
: *required* An object expression that evaluates to a **DataMembers** object.

After **Clear**, [**Count**](#count) is `0`. Use this when the set of data members the source can supply changes wholesale — for example, after the source is reconfigured.

### Count

Returns the number of names in the collection.

Syntax: *object*.**Count**

*object*
: *required* An object expression that evaluates to a **DataMembers** object.

The value is a **Long**. Valid indexes for [**Item**](#item) run from `1` to **Count**.

### Item

Returns a single data member name from the collection.

Syntax: *object*.**Item(** *index* **)**

*object*
: *required* An object expression that evaluates to a **DataMembers** object.

*index*
: *required* A **Long** giving the one-based position of the name to return. Must be between `1` and [**Count**](#count); otherwise an error occurs.

**Item** is the default member of **DataMembers**, so the following lines are equivalent:

```tb
name = MyDataMembers.Item(1)
name = MyDataMembers(1)
```

The result is a **String**.

### Remove

Removes a single entry from the collection, identified either by position or by name.

Syntax: *object*.**Remove** *index*

*object*
: *required* An object expression that evaluates to a **DataMembers** object.

*index*
: *required* A **Variant** identifying the entry to remove. If numeric, it is treated as a one-based position between `1` and [**Count**](#count). If a **String**, it is matched against the names previously passed to [**Add**](#add). If no entry matches, an error occurs.

### For Each iteration

A **DataMembers** object can be iterated with the [**For Each...Next**](../../../Core/For-Each-Next) statement, which yields each name in turn, in the order it was added. The hidden `_NewEnum` member supplies the enumerator and is not called directly from user code.

```tb
Dim Name As Variant
For Each Name In MyDataMembers
    Debug.Print Name
Next Name
```
