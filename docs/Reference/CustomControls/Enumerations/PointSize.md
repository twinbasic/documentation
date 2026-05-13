---
title: PointSize
parent: Enumerations
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/Enumerations/PointSize
---
# PointSize
{: .no_toc }

> [!NOTE]
> **PointSize** is declared as an empty `Enum` block (with a placeholder `[_MAX] = 0` member) only because twinBASIC has not yet exposed a type-alias syntax such as `Type PointSize = Long`. The source carries a `FIXME` comment noting the stand-in. Treat **PointSize** as a **Long**-compatible type alias rather than as an enumeration with named members; when alias syntax becomes available, the enum stand-in will be replaced.

A **Long**-compatible type alias for a font size, expressed in *typographic points* (a point is 1⁄72 of an inch). Used by [**FontStyle.Size**](../Styles/TextRendering#size). New [**FontStyle**](../Styles/TextRendering) objects default to 12 points.
