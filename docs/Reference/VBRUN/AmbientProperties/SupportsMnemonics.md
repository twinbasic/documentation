---
title: SupportsMnemonics
parent: AmbientProperties Module
permalink: /tB/Packages/VBRUN/AmbientProperties/SupportsMnemonics
---
# SupportsMnemonics
{: .no_toc }

Returns whether the container will dispatch keyboard mnemonics to embedded controls, as a **Boolean**. Read-only.

Syntax: *object*.**SupportsMnemonics**

*object*
: *required* An object expression that evaluates to an **AmbientProperties** object.

A mnemonic is the underlined letter in a caption such as `&File` --- it gives the user a way to invoke the control with **Alt+F**. When **SupportsMnemonics** is **True**, the container forwards mnemonic keystrokes to the control; the control should then underline its mnemonic letter when displaying the caption. When the property is **False**, the host will not forward mnemonics, and the control should display its caption without underlining.

### See Also

- [DisplayAsDefault](DisplayAsDefault) property
- [MessageReflect](MessageReflect) property
