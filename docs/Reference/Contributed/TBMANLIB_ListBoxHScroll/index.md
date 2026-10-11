---
title: TBMANLIB_ListBoxHScroll Package
parent: Contributed Packages
has_toc: false
indexed_from: 1.0.0.0
permalink: /tB/Packages/Contributed/TBMANLIB_ListBoxHScroll/
---

# TBMANLIB_ListBoxHScroll Package
{: .no_toc }

**Author:** woeoio

The **TBMANLIB_ListBoxHScroll** contributed package provides a helper class that adds a functional horizontal scrollbar to a standard VB **ListBox** control by combining the `LB_SETHORIZONTALEXTENT` message, Win32 scroll-info APIs, and window subclassing.

## Classes

- [cListboxHScroll](cListboxHScroll/) -- a helper class that adds a functional horizontal scrollbar to a standard VB ListBox control using GDI text measurement, `LB_SETHORIZONTALEXTENT`, and window subclassing
  - [Show](cListboxHScroll/Show) -- attaches the horizontal scrollbar to a ListBox control and initialises scroll handling
  - [UnShow](cListboxHScroll/UnShow) -- removes the window subclass installed by Show
