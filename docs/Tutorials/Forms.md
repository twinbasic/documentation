---
title: Forms basics
parent: Tutorials
permalink: /Tutorials/Forms
---

# Forms basics
{: .no_toc }

This tutorial builds a small temperature-converter application. By the end you will know how to add standard controls to a form, set their properties at design time and at runtime, write event handlers, and validate user input.

- TOC
{:toc}

## What you will build

A Standard EXE with one form. The user types a temperature value, selects a direction (Celsius to Fahrenheit or Fahrenheit to Celsius), clicks a button, and sees the result. The finished form looks something like this:

<!-- screenshot: completed temperature converter form showing txtInput, fraDirection frame with two OptionButtons, cmdConvert button, and lblResult label -->

The worked example is small enough to finish in under ten minutes, but it touches the controls and patterns that appear in almost every VB6-compatible program.

## Step 1: Create the project

Open twinBASIC and choose **File → New Project → Standard EXE**. The IDE creates a new project with one form, `Form1`, already open in the designer.

<!-- screenshot: New Project dialog with Standard EXE selected -->

## Step 2: Add and arrange controls

The Toolbox panel on the left lists the controls available in the current project. You will need four control types: **Label**, **TextBox**, **Frame** (to group the OptionButtons), **OptionButton**, **CommandButton**, and a second **Label** for the output. If the Toolbox is not visible, open it with **View → Toolbox**.

Double-click a control in the Toolbox to drop it onto the form, or click once in the Toolbox and then drag a rectangle on the form to place and size it.

Add the following controls in order:

| Control | Name | Caption / Text | Purpose |
|---------|------|----------------|---------|
| Label | `lblInputPrompt` | `Temperature:` | Prompt for the input field |
| TextBox | `txtInput` | *(blank)* | User types the temperature value here |
| Frame | `fraDirection` | `Convert` | Groups the two OptionButtons |
| OptionButton | `optCtoF` | `Celsius → Fahrenheit` | Direction selector |
| OptionButton | `optFtoC` | `Fahrenheit → Celsius` | Direction selector |
| CommandButton | `cmdConvert` | `Convert` | Triggers the calculation |
| Label | `lblResult` | *(blank)* | Displays the result |

To rename a control, select it and change the **Name** property in the Properties window on the right. Change the displayed text by setting the **Caption** property (for labels, frames, option buttons, and command buttons) or the **Text** property (for text boxes).

> [!NOTE]
> Place both OptionButtons inside the Frame by dragging them onto the frame rather than onto the form directly. Controls inside a Frame form an exclusive group --- selecting one automatically deselects the others.

### Setting properties at design time

Select `optCtoF` and set its **Value** property to `True` in the Properties window. This makes it the default selection when the form opens.

Select `lblResult` and set its **Font** property. Click the `...` button next to the Font value to open the Font dialog. Choose a size that makes the result easy to read, such as 12 pt.

<!-- screenshot: Properties window showing lblResult selected with Font property highlighted -->

## Step 3: Write the event handler

Double-click the `cmdConvert` button in the designer. The IDE switches to the Code Editor and creates a shell for the button's Click event:

```tb
Private Sub cmdConvert_Click()

End Sub
```

Fill it in as follows:

```tb
Private Sub cmdConvert_Click()
    If Not IsNumeric(txtInput.Text) Then
        lblResult.Caption = "Please enter a number."
        Exit Sub
    End If

    Dim value As Double
    value = CDbl(txtInput.Text)

    Dim result As Double
    Dim unit As String

    If optCtoF.Value Then
        result = value * 9 / 5 + 32
        unit = "°F"
    Else
        result = (value - 32) * 5 / 9
        unit = "°C"
    End If

    lblResult.Caption = Format(result, "0.00") & " " & unit
End Sub
```

The handler:

1. Checks that the input is numeric before converting it. [**IsNumeric**](../tB/Modules/Information/IsNumeric) returns `False` for empty strings, letters, or punctuation other than a decimal point or leading minus.
2. Reads `optCtoF.Value` to determine the direction. Because the two OptionButtons are in the same Frame, exactly one of them is always `True`.
3. Calls [**Format**](../tB/Modules/Strings/Format) to round the result to two decimal places.

## Step 4: Run the application

Press **F5** (or **Run → Start**). The form appears. Type `100` into the text box, make sure `Celsius → Fahrenheit` is selected, and click **Convert**. The label should show `212.00 °F`.

Try switching to `Fahrenheit → Celsius` and converting `32` --- the result should be `0.00 °C`.

Close the form to stop the application and return to the IDE.

## Setting properties at runtime

Design-time properties are convenient but limited. You can read and write most control properties from code at any time. Add a `Form_Load` handler to set the form's title bar text and give `lblResult` a starting caption:

```tb
Private Sub Form_Load()
    Me.Caption = "Temperature Converter"
    lblResult.Caption = "Enter a value and click Convert."
    optCtoF.Value = True    ' ensure the default is set in code too
End Sub
```

`Me` refers to the current form --- equivalent to writing `Form1` from inside the form's own module.

## Handling the KeyPress event

It is often convenient to trigger the conversion when the user presses **Enter** in the text box, without having to click the button. Double-click `txtInput` in the designer to open the code editor, then select `KeyPress` from the event drop-down at the top right:

```tb
Private Sub txtInput_KeyPress(KeyAscii As Integer)
    If KeyAscii = vbKeyReturn Then
        KeyAscii = 0          ' suppress the beep
        cmdConvert_Click      ' reuse the button's handler
    End If
End Sub
```

[**vbKeyReturn**](../tB/Packages/VBRUN/Constants/KeyCodeConstants) is the constant for the Enter key (ASCII 13). Setting `KeyAscii` to `0` tells the control not to process the keystroke further --- without this, pressing Enter in a TextBox makes a beep on most systems.

## A note on anchoring and docking

The controls added above use absolute positions. If the user resizes the form, the controls stay where you placed them and the layout may look awkward. twinBASIC supports **anchoring** (a control stays a fixed distance from one or more form edges as the form resizes) and **docking** (a control fills an edge or the entire client area).

These behaviours are set through the **Anchor** and **Dock** properties on the VB package controls. See [Features → Anchoring and Docking](../Features/GUI-Components/Anchoring-Docking) for a full explanation.

## Where to go next

- **Windows API** -- calling Win32 functions to read system information and drive platform features: [Calling the Windows API](Windows-API)
- **Custom controls** -- owner-drawn controls with gradient fills and per-pixel painting: [CustomControls tutorials](CustomControls/)
- **WebView2** -- embedding the Microsoft Edge browser engine inside a form: [WebView2 tutorials](WebView2/)
