---
title: MessageReflect
parent: AmbientProperties Module
permalink: /tB/Packages/VBRUN/AmbientProperties/MessageReflect
---
# MessageReflect
{: .no_toc }

Returns whether the container reflects window messages back to the control, as a **Boolean**. Read-only.

Syntax: *object*.**MessageReflect**

*object*
: *required* An object expression that evaluates to an **AmbientProperties** object.

Some Windows notification messages — such as **WM_COMMAND**, **WM_NOTIFY**, and the **WM_CTLCOLOR\*** family — are by default delivered to the parent window of the control that produced them. When **MessageReflect** is **True**, the container reflects those notifications back to the control's own window procedure as **OCM_\*** messages, so the control can handle them itself; when **False**, the container handles them and the control will not see them.

### See Also

- [SupportsMnemonics](SupportsMnemonics) property
- [UserMode](UserMode) property
