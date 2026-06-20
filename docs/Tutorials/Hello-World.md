---
title: Hello World
parent: Tutorials
permalink: /Tutorials/Hello-World
---

# Hello World
{: .no_toc }

In this tutorial you will create a Standard EXE project, place a button on a form, and write one line of code that shows a message box when the button is clicked. By the end you will have built and run your first twinBASIC application.

- TOC
{:toc}

## Create the project

Open twinBASIC and choose **File → New Project → Standard EXE**. The IDE creates a new project with one form, `Form1`, already open in the designer.

<!-- screenshot: New Project dialog with Standard EXE selected -->

Standard EXE is the most common project type. It produces a Windows executable with a form-based user interface --- the same kind of application that VB6 developers have built for decades.

## Add a button

Look at the Toolbox panel on the left side of the IDE. It lists every control available in the current project. If the Toolbox is not visible, open it with **View → Toolbox**.

Find the **CommandButton** entry in the Toolbox and double-click it. A button appears on `Form1` with the default name `Command1` and the caption `Command1`.

<!-- screenshot: Form1 with a CommandButton in the designer -->

You can drag the button to reposition it, or drag its handles to resize it. For this tutorial the default size and position are fine.

## Write the click handler

Double-click the button in the designer. The IDE switches to the Code Editor and generates a skeleton for the button's **Click** event:

```tb
Private Sub Command1_Click()

End Sub
```

Place your cursor on the blank line inside the Sub and type:

```tb
MsgBox "Hello, World!"
```

The complete handler looks like this:

```tb
Private Sub Command1_Click()
    MsgBox "Hello, World!"
End Sub
```

[**MsgBox**](../tB/Modules/Interaction/MsgBox) displays a standard Windows message box with the text you pass to it. It pauses execution until the user dismisses the dialog.

## Run the application

Press **F5** (or choose **Run → Start**). The form appears as a regular window on your desktop. Click the **Command1** button. A message box pops up with the text "Hello, World!".

<!-- screenshot: MsgBox dialog showing "Hello, World!" -->

Click **OK** to close the message box, then close the form to stop the application and return to the IDE.

## What just happened

When you double-clicked the button in the designer, the IDE created an event-handler Sub named after the control and the event --- `Command1_Click`. twinBASIC calls this Sub automatically whenever the button receives a Click message from Windows.

**MsgBox** is a function from the [VBA runtime library](../tB/Modules/Interaction/MsgBox), which is part of every twinBASIC project by default. It wraps the Win32 `MessageBox` API and handles the dialog lifecycle for you.

The form itself is an operating-system window. Controls like **CommandButton** are child windows hosted inside it. The IDE's designer lets you position and configure these controls visually; the Code Editor is where you write the logic that responds to their events.

## Where to go next

- [**Forms basics**](Forms) --- adding multiple controls, setting properties, writing event handlers, and building a temperature converter.
- [**Arrays**](Arrays) --- fixed and dynamic arrays, bounds, and multi-dimensional shapes.
