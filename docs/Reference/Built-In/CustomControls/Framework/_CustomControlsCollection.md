---
title: _CustomControlsCollection
parent: Framework
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/Framework/_CustomControlsCollection
has_toc: false
---

# _CustomControlsCollection interface
{: .no_toc }

The default interface of the [**CustomControlsCollection**](CustomControlsCollection) CoClass. Defines the collection contract for the set of controls hosted on a custom form: indexed access by integer or name, enumeration with **For Each**, and runtime add and remove of controls.

Application code normally works through [**CustomControlsCollection**](CustomControlsCollection) rather than this interface directly. The interface name is prefixed with an underscore because it is a compiler-generated default interface, not an independently usable type.

## Properties

### Count
{: .no_toc }

The number of controls in the collection. **Long**. Read-only.

Syntax: *object*.**Count**

### Item
{: .no_toc }

Returns the control at the given index or with the given name. The default member (DispId 0) --- the shorthand *collection*( *IndexOrName* ) calls **Item**.

Syntax: *object*.**Item** ( *IndexOrName* ) **As Object**

*IndexOrName*
: *required* A **Variant** that is either a **Long** zero-based index or a **String** matching the control's **Name**.

## Methods

### Add
{: .no_toc }

Adds a new control to the collection by class **ProgID**, assigns it a name, and attaches it to a container.

Syntax: *object*.**Add** ( *ProgId*, *ControlName*, *Container* ) **As Object**

*ProgId*
: *required* A **String** holding the class **ProgID** of the control to create.

*ControlName*
: *required* A **String** giving the **Name** to assign to the new control.

*Container*
: *required* An **Object** reference to the form, frame, or other container that will host the new control.

Returns the newly created control as **Object**.

### Remove
{: .no_toc }

Removes the control at the given index or with the given name from the collection.

Syntax: *object*.**Remove** *IndexOrName*

*IndexOrName*
: *required* A **Variant** that is either a **Long** zero-based index or a **String** matching the control's **Name**.

## Iteration

A `For Each` loop over the collection produces every hosted control in turn. The hidden `_NewEnum` member (DispId -4) provides the enumerator; application code does not call it directly.

```tb
Dim ctl As Object
For Each ctl In MyForm.Controls
    Debug.Print ctl.Name
Next
```

## See Also

- [CustomControlsCollection](CustomControlsCollection) -- the CoClass whose default interface this is
- [ICustomControl](ICustomControl) -- the interface implemented by each control in the collection
- [CustomControlContext](CustomControlContext) -- the callback object passed to a control on **Initialize**
