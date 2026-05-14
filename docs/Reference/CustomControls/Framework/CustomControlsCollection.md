---
title: CustomControlsCollection
parent: Framework
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/Framework/CustomControlsCollection
has_toc: false
---

# CustomControlsCollection class
{: .no_toc }

The collection of controls hosted on a custom form. Accessed as the **Controls** property of a [**WaynesForm**](../WaynesForm/). Supports indexed access by integer or name, enumeration with **For Each**, and runtime add / remove of controls.

```tb
Dim ctl As Object
For Each ctl In MyForm.Controls
    Debug.Print ctl.Name
Next
```

## Properties

### Count
{: .no_toc }

The number of controls in the collection. **Long**. Read-only.

Syntax: *object*.**Count**

### Item
{: .no_toc }

Returns the control at the given index or with the given name. The **Default property** — the **Controls** ( *…* ) shorthand calls **Item**.

Syntax: *object*.**Item** ( *IndexOrName* ) **As Object**

*IndexOrName*
: *required* A **Variant** that is either a **Long** zero-based index or a **String** matching the control's [**Name**](../#controls).

## Methods

### Add
{: .no_toc }

Adds a new control to the collection by class **ProgID**, gives it a name, and attaches it to a container.

Syntax: *object*.**Add** ( *ProgId*, *ControlName*, *Container* ) **As Object**

*ProgId*
: *required* A **String** holding the class **ProgID** of the control to create.

*ControlName*
: *required* A **String** giving the **Name** to assign to the new control.

*Container*
: *required* An **Object** reference to the form, frame, or other container that will host the new control.

The newly-created control is returned, typed as **Object**.

### Remove
{: .no_toc }

Removes the control at the given index or with the given name from the collection.

Syntax: *object*.**Remove** *IndexOrName*

*IndexOrName*
: *required* A **Variant** that is either a **Long** zero-based index or a **String** matching the control's [**Name**](../#controls).

## Iteration

A `For Each` loop over the collection produces every hosted control in turn:

```tb
Dim ctl As Object
For Each ctl In MyForm.Controls
    ' …
Next
```

The hidden member that powers this is `_NewEnum`; application code does not call it directly.
