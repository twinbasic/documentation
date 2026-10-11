---
title: Modern IDE Features
parent: Compiler and IDE Features
nav_order: 4
permalink: /Features/Compiler-IDE/IDE-Features
---

# Modern IDE Features

While the twinBASIC IDE still has a lot of work planned, it already includes a number of features that make life much easier found in other modern IDE, but not the ancient VBx IDEs.

## Theme System
{: index="dark mode" }

Fully theme-able, with Dark (default), Light, and Classic (Light) built in. A theme is a short `.theme` text file of `Name: value;` pairs, which can inherit from another theme, so adding your own takes one small file. [Themes](../../tB/IDE/Customising/Themes) explains how.

## Code Navigation and Structure

- **Code folding**, with foldable custom-defined regions via `#Region "name" ... #End Region` blocks.
- **Sticky-scroll**, which keeps context lines at the top showing major sections of code like module, region, method, `With` blocks, etc.
- **Indent guides**, lines drawn along common indent points to help line things up right.
- **Code mini-map**, shows a graphics overview of the code structure alongside the scroll bar, helping to guide your scrolling.

## Editing Features

- **Fully customizable keyboard shortcuts** covering all commands. You keep your changes in groups that you switch on and off, and each group is layered on top of the built-in keys. See [Keyboard shortcuts](../../tB/IDE/Customising/Keyboard-Shortcuts).
- **Auto-indent on paste**, and **paste as comment**. See [Copy, cut and paste](../../tB/IDE/Code/Editor#copy-cut-and-paste).
- **Inline code hints**, which provide annotations at the end of blocks for what the block is (see picture). See [Inline code hints](../../tB/IDE/Code/IntelliSense#inline-code-hints).
- **Color-matching** for parentheses and brackets, which the theme sets.
- **Several cursors**, **bookmarks**, **a list of recently closed tabs** and **combo boxes that insert event handlers**. [Writing code](../../tB/IDE/Code/) describes the editor in full.

## Advanced Features

- **Full Unicode support** in .twin files, so you can use the full Unicode range of the font in your comments and strings.
- **Advanced Information popup**, which shows offsets for UDT members, their total size via both `Len()` plus `LenB()`, and their alignment; and v-table entry offsets for interfaces and classes, as well as their inheritance chain.
- **A type library viewer** for controls and TLB files that displays the full contents in twinBASIC-style syntax rather than ODL.

## Panels and Windows

- **A History panel** containing a list of the places you edited recently. See [History](../../tB/IDE/Code/Navigating#history).
- **An Outline panel** with selectable categories. See [Outline](../../tB/IDE/Code/Navigating#outline).
- **A Diagnostics panel** (the Problems panel), which lists all current errors, warnings, hints and information messages, and which you can filter by kind. See [Diagnostics](../../tB/IDE/Code/Diagnostics).

## Form Designer Enhancements

On the Form Designer, control with `Visible = False` are faded to visually indicate this. Also, pressing and holding Control shows the tab index of each tab stop.

![The whole twinBASIC IDE window with a class open in the editor and twelve labels, each with an arrow: Sticky scroll at the class and function lines held at the top of the editor, Colour matching at a line of nested brackets, Unicode in the editor at a string holding an emoji and Japanese text, Indent guides at the guide line through an empty line inside an If block, Inline code hints at the hint after Next, Advanced info popup at the hover over a user-defined type that lists its members' offsets, its Len and LenB and its alignment, Mini-map at the code overview at the editor's right, Folding controls at a fold arrow beside a function, Memory usage and object counts at the status bar, and Outline, History and Diagnostics at those panels down the left of the window](../Images/IDE-FeatureMap.png){:width="1440" height="900"}

### New Code-Based Project Explorer

A new code structure based Project Explorer:

![The Project Explorer in code-based view, grouping the project into Modules, Forms, Interfaces and User Defined Types, each item beside the file it comes from, above the collapsed VBA, VBRUN and VB packages](../Images/9a5c50d5-a9f8-44a7-96f7-ae84548bd7ef.png){:width="423" height="526"}

The classic file-based view is still used by default, you can activate the new view with a toggle button:

![The Project Explorer title bar with the file view toggle button highlighted](../Images/b000d3aa-3689-4d94-88e3-bca44f8b7de6.png){:width="296" height="30"}

## View Forms and Packages as JSON

Project forms and packages are stored as JSON format data, and you can view this by right-click in Project Explorer and selecting **View As JSON**. This is particularly interesting for packages as it exposes the entire code in a more parseable format.

![The Project Explorer with the Packages folder open, and the right-click menu of CustomControlsPackage with View As JSON highlighted](../Images/22660f54-ff5d-4b21-93d3-39715f1f35ed.png){:width="485" height="409"}

![The CustomControls package shown as JSON in the editor, listing its components with their events, fields and procedures](../Images/a6525b1d-ac22-4303-ae27-7984c20eba0c.png){:width="756" height="198"}
