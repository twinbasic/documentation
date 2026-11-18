---
title: ProgressBar
parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/ProgressBar
has_toc: false
symbols:
  - ProgressBar
  - PrbOrientationConstants
  - PrbScrollingConstants
  - PrbStateConstants
---

# ProgressBar class
{: .no_toc }

A **ProgressBar** is a bar that fills as a task advances through a range. It can also run as a marquee for a task of unknown length, show a normal, an error or a paused state, draw a text over the bar, and repeat its progress on the form's taskbar button.

```tb check_build check_run arch=win32,win64
ProgressBar1.Min = 0
ProgressBar1.Max = 250
ProgressBar1.Value = 100
ProgressBar1.Text = "{3} %"          ' the bar shows "40 %"
ProgressBar1.Increment 25
Debug.Print ProgressBar1.Value
' Output:
'  125
```

The control stands in place of the ProgressBar of the Microsoft common controls (`MSCOMCTL.OCX`). The [WinNativeCommonCtls](../../WinNativeCommonCtls/ProgressBar) package has a **ProgressBar** too; this one adds [**Text**](#text), [**ShowInTaskBar**](#showintaskbar), [**StepAutoReset**](#stepautoreset) and [**Increment**](#increment).

Of the [common members](Common), the control has those under [Name and place](Common#name-and-place) but **HelpContextID**, [Window handles](Common#window-handles), [Font and visual styles](Common#font-and-visual-styles), [Mouse](Common#mouse), [Dragging the control](Common#dragging-the-control), [OLE drag and drop](Common#ole-drag-and-drop) and [Right-to-left](Common#right-to-left), **RightToLeftLayout** included. It never takes the focus, so it has no keyboard events.

* TOC
{:toc}

## Range, value and steps

[**Min**](#min) and [**Max**](#max) are the ends of the range, and [**Value**](#value) is the position in it. A program sets **Value**, adds to it with [**Increment**](#increment), or calls [**StepIt**](#stepit) once for each part of the task done, which adds [**Step**](#step).

<!-- test: ProgressBarTests.Value_OutsideTheRange_IsTheNearestEnd, ProgressBarTests.StepIt_PastMax_StartsAgainFromMin, ProgressBarTests.StepIt_StepAutoResetFalse_StopsAtMax -->
A **Value** outside the range becomes the nearest end of it. A **StepIt** that would pass **Max** starts again from **Min**, as the progress bar of Windows does, unless [**StepAutoReset**](#stepautoreset) is **False**: then the bar stops at **Max**.

```tb check_build check_run arch=win32,win64
ProgressBar1.Min = 0
ProgressBar1.Max = 100
ProgressBar1.Step = 30
ProgressBar1.Value = 500
Debug.Print ProgressBar1.Value
ProgressBar1.Value = 90
ProgressBar1.StepIt                     ' 120 is 20 past Max
Debug.Print ProgressBar1.Value
ProgressBar1.StepAutoReset = False
ProgressBar1.Value = 90
ProgressBar1.StepIt
Debug.Print ProgressBar1.Value
' Output:
'  100
'  20
'  100
```
<!-- /test -->

## A task of unknown length

With [**Scrolling**](#scrolling) set to **PrbScrollingMarquee** the bar shows a block that moves along it again and again, for a task whose length the program does not know. [**MarqueeAnimation**](#marqueeanimation) starts and stops the movement, and [**MarqueeSpeed**](#marqueespeed) is the time between its steps.

```tb check_build
ProgressBar1.Scrolling = PrbScrollingMarquee
ProgressBar1.MarqueeSpeed = 30
ProgressBar1.MarqueeAnimation = True
```

## Text on the bar

[**Text**](#text) is drawn in the middle of the bar, in the control's **Font** and in [**TextColor**](#textcolor). Four placeholders in it stand for the bar's numbers:

| Placeholder | Replaced by |
|---|---|
| `{0}` | [**Value**](#value) |
| `{1}` | [**Min**](#min) |
| `{2}` | [**Max**](#max) |
| `{3}` | the part of the range done, as a whole number from 0 to 100 |

## On the taskbar

With [**ShowInTaskBar**](#showintaskbar) set to **True**, the taskbar button of the window the control is in shows the same progress: the part of the range done, in green, red or yellow by [**State**](#state), or the moving light of a task of unknown length while a marquee is animated.

Properties
----------

### Align
{: .no_toc }

The edge of the form that the control is attached to, where it takes the form's whole width or height. A member of [**AlignConstants**](../../VBRUN/Constants/AlignConstants). Default: **vbAlignNone**.

### BackColor
{: .no_toc }

The color of the track, behind the bar. **OLE_COLOR**. Default: **vbButtonFace**. It shows only while the control is drawn without visual styles, with [**VisualStyles**](Common#visualstyles) set to **False**.

### BorderStyle
{: .no_toc }

Whether the control has a border of one line. **Integer**: 0 for none (the default) or 1 for a line. Another value raises run-time error 380.

### ForeColor
{: .no_toc }

The color of the bar. **OLE_COLOR**. Default: **vbHighlight**. It shows only while the control is drawn without visual styles.

### MarqueeAnimation
{: .no_toc }

Whether the marquee's block is moving. **Boolean**. Default: **False**. It has an effect while [**Scrolling**](#scrolling) is **PrbScrollingMarquee**.

### MarqueeSpeed
{: .no_toc }

The time between two steps of the marquee, in milliseconds. **Long**. Default: 80.

<!-- test: ProgressBarTests.MarqueeSpeed_Zero_Raises380 -->
A value of 0 or less raises run-time error 380.
<!-- /test -->

### Max
{: .no_toc }

The upper end of the range. **Long**. Default: 100.

<!-- test: ProgressBarTests.Max_NotAboveMin_Raises380 -->
A value that is not greater than [**Min**](#min) raises run-time error 380, so a program that moves the whole range upward sets **Max** first.
<!-- /test -->

### Min
{: .no_toc }

The lower end of the range. **Long**. Default: 0.

<!-- test: ProgressBarTests.Min_NotBelowMax_Raises380 -->
A value that is not less than [**Max**](#max) raises run-time error 380.
<!-- /test -->

### Orientation
{: .no_toc }

Whether the bar fills from left to right or from bottom to top. A member of [**PrbOrientationConstants**](#prborientationconstants). Default: **PrbOrientationHorizontal**. A change exchanges the control's width and height, unless the control is attached to an edge of the form with [**Align**](#align).

### Scrolling
{: .no_toc }

How the bar is drawn. A member of [**PrbScrollingConstants**](#prbscrollingconstants). Default: **PrbScrollingStandard**.

### ShowInTaskBar
{: .no_toc }

Whether the taskbar button of the control's window shows the progress as well. **Boolean**. Default: **False**. See [On the taskbar](#on-the-taskbar).

### SmoothReverse
{: .no_toc }

Whether the bar, drawn with visual styles, moves back smoothly when [**Value**](#value) is made smaller. **Boolean**. Default: **False**, with which it jumps back.

### State
{: .no_toc }

The state the bar shows. A member of [**PrbStateConstants**](#prbstateconstants). Default: **PrbStateNormal**. It shows while the control is drawn with visual styles.

### Step
{: .no_toc }

What [**StepIt**](#stepit) adds to [**Value**](#value). **Long**. A control newly drawn on a form has 10.

### StepAutoReset
{: .no_toc }

Whether a [**StepIt**](#stepit) that would pass [**Max**](#max) starts again from [**Min**](#min). **Boolean**. Default: **True**. With **False** such a call sets [**Value**](#value) to **Max**.

### Text
{: .no_toc }

The text drawn in the middle of the bar. **String**. Default: empty. See [Text on the bar](#text-on-the-bar) for its placeholders.

### TextColor
{: .no_toc }

The color of [**Text**](#text). **OLE_COLOR**. Default: **vbWindowText**.

### Value
{: .no_toc }

The position in the range. **Long**. Default: 0. It is the control's default property. A value outside the range becomes the nearest end. A change raises [**Change**](#change). While a marquee is shown the bar does not draw it.

Methods
-------

### Increment
{: .no_toc }

Adds an amount to [**Value**](#value), and raises [**Change**](#change) if **Value** changed.

Syntax: *object*.**Increment** *Delta*

*Delta*
: *required* A **Long**: what to add. A negative amount moves the bar back.

### StepIt
{: .no_toc }

Adds [**Step**](#step) to [**Value**](#value), and raises [**Change**](#change) if **Value** changed. [Range, value and steps](#range-value-and-steps) says what it does at the end of the range.

Syntax: *object*.**StepIt**

Events
------

### Change
{: .no_toc }

<!-- test: ProgressBarTests.Change_RaisedOnceForEachChangeOfValue -->
Raised when [**Value**](#value) has changed, by an assignment, [**StepIt**](#stepit) or [**Increment**](#increment). Assigning the value the bar already has raises nothing.
<!-- /test -->

Syntax: *object*\_**Change**( )

## PrbOrientationConstants
{: #prborientationconstants }

The values of [**Orientation**](#orientation).

| Member | Value | Description |
|---|---|---|
| **PrbOrientationHorizontal**{: #PrbOrientationConstants_PrbOrientationHorizontal } | 0 | The bar fills from left to right. |
| **PrbOrientationVertical**{: #PrbOrientationConstants_PrbOrientationVertical } | 1 | The bar fills from bottom to top. |

## PrbScrollingConstants
{: #prbscrollingconstants }

The values of [**Scrolling**](#scrolling).

| Member | Value | Description |
|---|---|---|
| **PrbScrollingStandard**{: #PrbScrollingConstants_PrbScrollingStandard } | 0 | A bar of separate blocks where the control is drawn without visual styles. With them it is drawn as **PrbScrollingSmooth** is. |
| **PrbScrollingSmooth**{: #PrbScrollingConstants_PrbScrollingSmooth } | 1 | A bar in one piece. |
| **PrbScrollingMarquee**{: #PrbScrollingConstants_PrbScrollingMarquee } | 2 | A block that moves along the bar while [**MarqueeAnimation**](#marqueeanimation) is **True**. |

## PrbStateConstants
{: #prbstateconstants }

The values of [**State**](#state).

| Member | Value | Description |
|---|---|---|
| **PrbStateNormal**{: #PrbStateConstants_PrbStateNormal } | 1 | The task is running: a green bar. |
| **PrbStateError**{: #PrbStateConstants_PrbStateError } | 2 | The task has failed: a red bar. |
| **PrbStatePaused**{: #PrbStateConstants_PrbStatePaused } | 3 | The task is paused: a yellow bar. |

## See Also

- [Common members](Common) -- the members this control shares with the package's other controls
- [ProgressBar](../../WinNativeCommonCtls/ProgressBar) -- the control of the same name in the WinNativeCommonCtls package
