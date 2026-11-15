---
title: VBFLXGRD18 Package
parent: Contributed Packages
has_toc: false
exclude_from_docs:
  - Common
  - VisualStyles
  - VTableHandle
  - VTableInterfaceConstants
  - VBFlexGridBase
indexed_from: 1.8.69.0
permalink: /tB/Packages/Contributed/VBFLXGRD18/
---

# VBFLXGRD18 Package
{: .no_toc }

**Author:** Krool. **Version:** 1.8.69.0. **On GitHub:** [Kr00l/VBFLXGRD](https://github.com/Kr00l/VBFLXGRD)

The **VBFLXGRD18** contributed package provides the **VBFlexGrid** control, a grid of rows and columns that shows text, pictures and check boxes, and lets the user select, edit, sort, resize and rearrange them.

The control is Krool's replacement for the Microsoft FlexGrid control of VB6 (`MSFLXGRD.OCX`), written in VB6 and published on GitHub as an ActiveX control, `VBFLXGRD18.OCX`; this package is the same code compiled by twinBASIC, so a project needs no OCX to be registered. Most members of the Microsoft FlexGrid keep their names and meanings, and the **VBFlexGrid** adds editing in the cell, drop-down lists, buttons and calendars in cells, check boxes, sort arrows, frozen rows and columns, merged cells, an undo queue, an incremental search and binding to data sources. This section documents version 1.8.69.0, published under the MIT licence. The package describes itself as "VB FlexGrid Control 1.8 (Experimental, 32-bit and 64-bit)", and its 32-bit and 64-bit builds behave the same.

```tb check_build check_run slot=sub arch=win32,win64
With VBFlexGrid1
    .FixedRows = 1
    .FixedCols = 0
    .Rows = 4
    .Cols = 2
    .FormatString = "Fruit|>Price"
    .TextMatrix(1, 0) = "Pear":  .TextMatrix(1, 1) = "2.10"
    .TextMatrix(2, 0) = "Apple": .TextMatrix(2, 1) = "0.95"
    .TextMatrix(3, 0) = "Plum":  .TextMatrix(3, 1) = "3.40"
    .Col = 1
    .Sort = FlexSortNumericAscending
    Debug.Print .TextMatrix(1, 0); " "; .TextMatrix(3, 0)
End With
' Output:
' Apple Plum
```

* TOC
{:toc}

## Adding the control to a form

Add the package to the project as [Importing a package from TWINSERV](../../../../Features/Packages/Importing-TWINSERV) describes. The control is then in the [Toolbox](../../../IDE/Project/Toolbox): select **VBFlexGrid** and draw it on the form. In code it is named as any other control on the form is, **VBFlexGrid1** for the first one. [Adding the control to a form](VBFlexGrid/#adding-the-control-to-a-form) on the control's page says what a new grid looks like and which errors its members raise.

## Contents

- [VBFlexGrid](VBFlexGrid/) -- the control, with its members on 15 topic pages: rows and columns, sizes, cell text, cell formatting, merging, selection, scrolling, the mouse and the keyboard, editing, drop-down lists and calendars, check boxes, sorting and searching, the clipboard and arrays, data binding, and appearance.
- [Enumerations](Enumerations/) -- the 61 enumerations of the control's members, on three pages by topic.
- [IVBFlexDataSource](IVBFlexDataSource) -- the interface that a class implements to give the grid its data, set as [**FlexDataSource**](VBFlexGrid/DataBinding#flexdatasource).
- [IVBFlexDataSource2](IVBFlexDataSource2) -- the optional second interface of such a class: check boxes, tool tips and flags for each cell.

The package also has four modules, `Common`, `VisualStyles`, `VTableHandle` and `VBFlexGridBase`, whose procedures and constants a project can reach. They are the control's own helper code (subclassing, conversions, the in-place activation of the control and the like), and this section does not document them.

## See Also

- [Contributed Packages](../)
- [VBComDlg](../VBComDlg/) -- Krool's **CommonDialog** class, also a package

## Test cases

The notes and warnings of this section are checked by the test cases in [VBFLXGRD18-tests.twinproj](VBFLXGRD18-tests.twinproj), a twinBASIC project. It uses VBFLXGRD18 as a [linked package](../../../../Features/Packages/Linked#manual-management): put the package's `.twinpack` in `%APPDATA%\twinBASIC\packages`, then run the project, and each case prints whether it passes.
