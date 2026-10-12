---
title: Designing forms
parent: IDE
nav_order: 5
permalink: /tB/IDE/Forms/
has_toc: false
redirect_from:
  - /tB/IDE/Project/Editor/Form
index:
  - form designer
  - designer
  - tbform
  - tbcontrol
  - tbppage
---

# Designing forms

A designer is the window where you build a form by drawing controls on it, and where you set the properties of the form and of each control. The same designer builds user controls and property pages.

- [**Designer**](Designer) --- adding a form, opening it, switching between design and code, the parts of the window, the grid, zoom, locks and the tab order.
- [**Working with controls**](Controls) --- drawing, selecting, moving and sizing controls, the clipboard, containers, control arrays, in-place editing, the right-click menu and the keys.
- [**Arranging controls**](Arranging) --- the **Format** menu: aligning, making the same size, spacing, centring and ordering a selection.
- [**Menu editor**](Menu-Editor) --- designing the menus of a form.
- [**Toolbox**](Toolbox) --- the list of controls you can draw, its search, and how to add ActiveX controls.
- [**Properties**](Properties) --- the **PROPERTIES** pane: its editors, the colour picker, the **EVENTS** tab and the units of positions.
- [**Previewing a form**](Previewing) --- running one form on its own, and the **RESYNC** button.

Reports have their own page: [Designing reports](../Reports/). The commands of the **Format** menu are listed in the [Format menu](../Reference/Menu/Format) reference page. The controls themselves are listed in [Controls](../../Controls). The language side of forms is in [Forms](../../../Features/GUI-Components/Forms) and [Anchoring and docking](../../../Features/GUI-Components/Anchoring-Docking).

## What a designer opens

One designer opens four kinds of file. Each kind has a partner `.twin` file that holds its code.

| File | What it designs | Added with |
|---|---|---|
| `.tbform` | A Windows form, a Windows MDI form, a CustomControls form, or a form of a kind that a package supplies. | **Add Windows Form**, **Add Windows MDI Form**, **Add CustomControls Form** or **Add** *name* **Form** |
| `.tbcontrol` | A user control. | **Add Windows UserControl** |
| `.tbppage` | A property page. | **Add Windows PropertyPage** |
| `.tbreport` | A report. See [Designing reports](../Reports/). | **Add Windows Report** |

The kinds differ in a few ways:

- The **Form Menu** bar, where the [menu editor](Menu-Editor) works, is on a Windows form, an MDI form and a user control. A CustomControls form and a report do not have it.
- The [Toolbox](Toolbox) lists the CustomControls for a CustomControls form, and the Windows controls for every other designer except a report, which lists seven.
- [Preview](Previewing) works for a form and a report. The button is greyed out in the designer of a user control, and <kbd>F6</kbd> does nothing there.
- A CustomControls form has no control arrays.

## How a designer works

The IDE does not draw the controls. It asks the compiler for a picture of each one and lays the pictures on the form. What you see is the way the compiler draws the control, and a control the compiler cannot draw appears as a grey box.

The designer sends every real change to the compiler, and writes the form to the `.tbform` file as JSON text when you save. Each form file and its `.twin` file have the same `FormDesignerId` attribute, which ties them together.

Each open designer has a [Toolbox](Toolbox) and a [PROPERTIES](Properties) pane of its own. The two panes show those of the active designer, and they are empty while a code tab is active.

Two kinds of setting differ in where they live. The grid, the outlines and the locks belong to the form, are saved in its file, and can differ from one form to the next. The zoom, the tab that **PROPERTIES** shows, its search boxes and the undo history belong to the session. The IDE forgets them when you close the designer's tab.

## See Also

- [Writing code](../Code/) -- the code editor, for the `.twin` half of a form
- [Adding files](../Projects/Adding-Files) -- the **Add** menu that creates forms
- [Running and debugging](../Debugging/) -- running a program that shows forms
- [Customising the IDE](../Customising/IDE-Options#form-designer-and-toolbox) -- the options of the designer and the Toolbox
