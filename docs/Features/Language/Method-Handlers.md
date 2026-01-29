---
title: Method Handler Syntax
parent: Language Syntax
nav_order: 15
---

# New Class Member Handler Syntax

You can now separate the name of method from the class member it applies to.

## Handles for Events

For events on Forms, UserControls, and event-raising objects, you can define any method as the handler, rather than need to name it as `Object_Event()`, by following it with `Handles Object.Event`. For example, in a form, instead of `Private Sub Form_Load()` you could handle the `Load` event with `Private Sub OnLoad() Handles Form.Load`.

## Implements for Interfaces

Similar to the above, for forms/UCs/classes that use `Implements`, you can use `Sub Bar() Implements IFoo.Bar`. Note that you can specify more than one implemented method; for more information, see the [Enhancements to Implements section](Interfaces-Coclasses.md).

> [!NOTE]
> These are opt-in and optional. For compatibility, twinBASIC will always continue to support the traditional syntax for event handling and Implements, and you're not required to use this new syntax (or *any* of the additions described in this article). Whether or not automatically created prototypes use this syntax is controlled via IDE Options: "IDE: Use new handles/implements syntax".
