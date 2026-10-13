---
title: cLayer
parent: TBMANLIB Package
permalink: /tB/Packages/Contributed/TBMANLIB/cLayer
has_toc: false
---

# cLayer class
{: .no_toc }

A **cLayer** is meant to hold the user-interface helpers of the package. In version 1.0.0.29 it has one member, [**Toast**](#toast), which shows a message box. The package keeps one ready-made instance, [**TBMAN.Layer**](TBMAN#layer).

```tb check_build
Dim Layer As New cLayer
Layer.Toast "The file was saved."
```

## Methods

### Toast
{: .no_toc }

Shows a message in a message box.

Syntax: *object*.**Toast** ( *Msg* ) **As Long**

*Msg*
: *required* A **String**, the text of the message.

The method calls **MsgBox** with the text and no other argument. It is a message box in the usual sense: a dialog with an **OK** button, which stops the program until the user closes it, and not a notice that fades away by itself. The result is always 0, because the code does not set it.

## See Also

- [TBMAN](TBMAN) module -- the shared instance **TBMAN.Layer**
- [MsgBox](../../../Modules/Interaction/MsgBox) function -- the message box that **Toast** shows
- [TBMANLIB](.) package -- overview
