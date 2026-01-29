---
title: Attributes Overview
parent: Attributes
nav_order: 1
permalink: /Features/Attributes
---

# Attributes Overview

Attributes have two major functions:

* they can act as instructions to compiler to influence how code is generated, or

* to annotate Forms, Modules, Classes, Types, Enums, Declares, and [procedures](../tB/Gloss#procedure) i.e. Subs/Functions/Properties.

Previously in VBx, these attributes, such as procedure description, hidden, default member, and others, were set via hidden text the IDE's editor didn't show you, configured via the Procedure Attributes dialog or some other places. In tB, these are all visible in the code editor. The legacy ones from VBx are supported for compatibility, but new attributes utilize the following syntax:
`[Attribute]` or `[Attribute(value)]`

Many new attributes enable the powerful additional language features twinBASIC provides, so some of the following items have their associated attributes included in their description.

See also [the comprehensive reference for attributes](../tB/Core/Attributes).
