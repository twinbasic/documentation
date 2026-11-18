---
title: NewTabCtl Package
parent: Experimental Packages
has_toc: false
indexed_from: 10.0.289.0
permalink: /tB/Packages/Contributed/NewTabCtl/
---

# NewTabCtl Package
{: .no_toc }

**Author:** EduardoVB. **Version:** 10.0.289.0. **On GitHub:** [EduardoVB/NewTab](https://github.com/EduardoVB/NewTab)

The **NewTabCtl** contributed package provides the **NewTab** control, a container with a row of tabs, each of which shows its own set of controls.

The control is EduardoVB's tab control for VB6, published on GitHub as an ActiveX control. This package is the same code as a twinBASIC package, so a project needs no OCX to be registered. The package describes itself as "NewTab: tabbed control (by EduardoVB, experimental 64-bit compatible version)". Its tab orientation constants keep the names of those of the VB6 SSTab control (`TABCTL32.OCX`), such as `ssTabOrientationTop`. This section documents version 10.0.289.0, published under the MIT licence.

<!-- test: compile IconCharHex_PropertyPageNotFound, compile HighlightMode_PropertyPageNotFound, compile HighlightModeSelectedTab_PropertyPageNotFound, compile Theme_PropertyPageNotFound -->
> [!NOTE] 10.0.289.0, BETA 1042
> The package does not compile, so a project that references it does not build. Four properties of the **NewTab** control, **IconCharHex**, **HighlightMode**, **HighlightModeSelectedTab** and **Theme**, each name a property page in a `VB_Invoke_Property` attribute: `pagNewTabIcons`, `pagHighlightMode` or `pagNewTabThemes`. The package holds no property page of those names, and twinBASIC reports each attribute with TB5259, *Failed to find named PropertyPage*.

This section has this page only. The members of the **NewTab** control are not documented yet.

## See Also

- [Experimental Packages](../../Experimental/) -- the packages from TWINSERV that are not yet ready for use in a program
- [Controls](../../../Controls#vb6-controls) -- where each VB6 control is in twinBASIC
