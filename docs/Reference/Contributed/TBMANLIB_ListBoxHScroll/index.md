---
title: TBMANLIB_ListBoxHScroll Package
parent: Experimental Packages
has_toc: false
indexed_from: 1.0.0.1
permalink: /tB/Packages/Contributed/TBMANLIB_ListBoxHScroll/
---

# TBMANLIB_ListBoxHScroll Package
{: .no_toc }

**Author:** woeoio. **Version:** 1.0.0.1

The **TBMANLIB_ListBoxHScroll** contributed package provides a helper class that adds a functional horizontal scrollbar to a standard VB **ListBox** control by combining the `LB_SETHORIZONTALEXTENT` message, Win32 scroll-info APIs, and window subclassing.

## Classes

- [cListboxHScroll](cListboxHScroll/) -- a helper class that adds a functional horizontal scrollbar to a standard VB ListBox control using GDI text measurement, `LB_SETHORIZONTALEXTENT`, and window subclassing
  - [Show](cListboxHScroll/Show) -- attaches the horizontal scrollbar to a ListBox control and initialises scroll handling
  - [UnShow](cListboxHScroll/UnShow) -- removes the window subclass installed by Show

## Test cases

The notes and warnings of this section are checked by the test cases in [TBMANLIB_ListBoxHScroll-tests.twinproj](TBMANLIB_ListBoxHScroll-tests.twinproj), a twinBASIC project. It uses TBMANLIB_ListBoxHScroll as a [linked package](../../../../Features/Packages/Linked#manual-management): put the package's `.twinpack` in `%APPDATA%\twinBASIC\packages`, then run the project, and each case prints whether it passes.
