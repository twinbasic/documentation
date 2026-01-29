---
title: Modern IDE Features
parent: Compiler and IDE Features
nav_order: 4
---

# Modern IDE Features

While the twinBASIC IDE still has a lot of work planned, it already includes a number of features that make life much easier found in other modern IDE, but not the ancient VBx IDEs.

## Theme System

Fully theme-able, with Dark (default), Light, and Classic (Light) built in, and an easy inheritance-based system to add your own themes via CSS files.

## Code Navigation and Structure

- **Code folding**, with foldable custom-defined regions via `#Region "name" ... #End Region` blocks.
- **Sticky-scroll**, which keeps context lines at the top showing major sections of code like module, region, method, `With` blocks, etc.
- **Indent guides**, lines drawn along common indent points to help line things up right.
- **Code mini-map**, shows a graphics overview of the code structure alongside the scroll bar, helping to guide your scrolling.

## Editing Features

- **Fully customizable keyboard shortcuts** covering all commands, with ability to save and switch between different sets.
- **Auto-indent on paste**.
- **Paste as comment**.
- **Inline code hints**, which provide annotations at the end of blocks for what the block is (see picture).
- **Color-matching** for parentheses and brackets.

## Advanced Features

- **Full Unicode support** in .twin files, so you can use the full Unicode range of the font in your comments and strings.
- **Advanced Information popup**, which shows offsets for UDT members, their total size via both `Len()` plus `LenB()`, and their alignment; and v-table entry offsets for interfaces and classes, as well as their inheritance chain.
- **A type library viewer** for controls and TLB files that displays the full contents in twinBASIC-style syntax rather than ODL.

## Panels and Windows

- **A History panel** containing a list of recently modified methods.
- **An Outline panel** with selectable categories.
- **Problems panel**, provides a list of all current errors and warnings (you can filter to show only one or the other).

## Form Designer Enhancements

On the Form Designer, control with `Visible = False` are faded to visually indicate this. Also, pressing and holding Control shows the tab index of each tab stop.

![image](../Images/014a1d28-30af-4a4d-8b9b-83ab6084f00a.png)
[Full size](../Images/fafaloneIDEscreenshot1.png)

### New Code-Based Project Explorer

A new code structure based Project Explorer:

![image](../Images/9a5c50d5-a9f8-44a7-96f7-ae84548bd7ef.png)

The classic file-based view is still used by default, you can activate the new view with a toggle button:

![image](../Images/b000d3aa-3689-4d94-88e3-bca44f8b7de6.png)

## View Forms and Packages as JSON

Project forms and packages are stored as JSON format data, and you can view this by right-click in Project Explorer and selecting 'View as JSON'. This is particularly interesting for packages as it exposes the entire code in a much more easily parsed format.

![image](../Images/22660f54-ff5d-4b21-93d3-39715f1f35ed.png)

![image](../Images/a6525b1d-ac22-4303-ae27-7984c20eba0c.png)
