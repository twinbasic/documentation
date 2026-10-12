---
title: xCalendar Package
parent: Experimental Packages
has_toc: false
indexed_from: 1.0.7.0
permalink: /tB/Packages/Contributed/xCalendar/
---

# xCalendar Package
{: .no_toc }

**Author:** sokinkeso. **Version:** 1.0.7.0

The **xCalendar** contributed package provides a calendar control: a grid of the days of one month, in which the user selects a date by clicking a day, by pressing a key, or by choosing a month or a year from a list. It is meant as a replacement for the Calendar control of `MSCAL.OCX`.

The package has one public class, **xCalendar**, a user control that draws itself with GDI calls. The class has 27 properties, 10 methods and 12 events, and four enumerations belong to it. This section documents version 1.0.7.0, published under the MIT licence. The package describes itself as "Calendar MSCAL replacement (Experimental, 32-bit and 64-bit)", and its 32-bit and 64-bit builds behave the same.

The package has defects: choosing a month from the month list can hang the program, and the colour properties of the text have no effect. [Known problems in version 1.0.7.0](#known-problems-in-version-1070) lists them.

```tb check_build
Private Sub Form_Load()
    xCalendar1.FirstDay = WeekDaysEnum.Monday
    xCalendar1.DayLength = DayLengthEnum.MediumLength
    xCalendar1.Value = #3/15/2026#
End Sub

Private Sub xCalendar1_AfterUpdate()
    Debug.Print "Selected: " & Format$(xCalendar1.Value, "yyyy-mm-dd")
End Sub
```

* TOC
{:toc}

## Adding the control to a form

Add the package to the project as [Importing a package from TWINSERV](../../../../Features/Packages/Importing-TWINSERV) describes. The control is then in the [Toolbox](../../../IDE/Project/Toolbox) like any other: select **xCalendar** and draw it on the form. In code the control is named as any other control on the form is, **xCalendar1** for the first one.

A control placed on a form starts with today's date selected and with the defaults given with each property. Every property except **ValueStr** is stored with the form. **Year**, **Month** and **Day** are stored as they were when the control was placed, and **Value** is stored only when it was set to a date other than the day of saving. A program that runs on a later day therefore starts with **Value** at today's date and **Year**, **Month** and **Day** of the day the control was placed: the control shows the month of that day, and no cell is selected when today is in another month. To start on a given date, set **Value** in the form's `Form_Load` procedure, or in the Properties panel.

### Declaring a variable

The project and its class are both named **xCalendar**, so a variable that holds a calendar is declared `As xCalendar.xCalendar`:

```tb check_build
Dim cal As xCalendar.xCalendar
Set cal = xCalendar1
Debug.Print cal.Year
```

> [!NOTE]
> `Dim cal As xCalendar` fails in BETA 1005 with TB5139, *[xCalendar] is a project or library, not a datatype*.
>
> ```tb check_build expect-error=TB5139
> Dim cal As xCalendar
> ```

The enumerations need the same care. **ShortLength** and **LongLength** are members of both **DayLengthEnum** and **MonthLengthEnum**, so the bare name is ambiguous, even in an assignment to a variable of one of the two enumeration types. Write the enumeration's name before the member:

```tb check_build
Dim d As DayLengthEnum = DayLengthEnum.LongLength
Dim m As MonthLengthEnum = MonthLengthEnum.LongLength
Debug.Print d, m   ' 2 1
```

> [!NOTE]
> In BETA 1005, `ShortLength` and `LongLength` written alone fail with TB5073, *'ShortLength' is ambiguous*.
>
> ```tb check_build expect-error=TB5073
> Dim d As DayLengthEnum = ShortLength
> ```

### A control that is not on a form

The start values of the properties are set when the control is placed on a form. An **xCalendar** created in code with `New xCalendar.xCalendar` and never placed on a form has **Year** 0 and **Value** 0 (12:00:00 AM), and none of the defaults given below.

## How the control is drawn

The control is drawn in up to three areas, one above the other: the title area, the row of day names and the grid of days. It draws into a hidden picture box and copies the result to its own surface. The control can have any size: the seven columns share the width equally, and the six rows share the height that the other areas leave.

The sizes inside the control, such as the margins and the two lists, are in device pixels and are not scaled with the DPI of the display. At 144 DPI a control that is 256 pixels wide at design time is 384 pixels wide, and its lists and margins keep their pixel sizes.

### Title area

The title area is present when **ShowTitle** or **ShowDateSelectors** is **True**, and has no height when both are **False**. Its height is the height of the title text in **TitleFont**, plus **TitleMargin** above and below. Its background is **BackColor**. It holds two things.

- **The title** is the name of the shown month and the year, such as `October 2026`, in **TitleFont**, centred in the space to the left of the date selectors. **MonthLength** decides whether the month is written in full or as its first three letters. It is drawn only when **ShowTitle** is **True**. The month name comes from the [**MonthName**](../../../Modules/Strings/MonthName) function, so it is in the language of the system.
- **The date selectors** are two drop-down lists at the right edge, drawn only when **ShowDateSelectors** is **True**. The month list is 80 pixels wide and holds the names of the twelve months. The year list is 50 pixels wide and holds the years 1900 to 2100. Both are 21 pixels high and centred in the height of the title area. The year list ends 5 pixels from the right edge of the control, and the month list ends 5 pixels before the year list. Choosing an entry changes the shown month or year, keeps the selected day of the month, and raises **NewMonth** or **NewYear**.

The title is centred in the width of the control less 140 pixels, the space that the two lists take, whether or not the lists are shown. At 144 DPI the lists are too small for their text: the year list shows `20` for 2026 and the month list `Octobe` for October. [Known problems](#known-problems-in-version-1070) describes both.

### Row of day names

The row is present when **ShowDays** is **True**. It has seven cells of the same width, filled with **DayBackColor**, each holding the name of a weekday centred, in **DayFont**. The first cell is the weekday that **FirstDay** names. **DayLength** decides whether a name is one letter, three letters or the whole name. The names come from the [**WeekdayName**](../../../Modules/Strings/WeekdayName) function, so they are in the language of the system. The height of the row is the height of the letter M in **DayFont**, plus **DaysMargin** above and below.

### Grid of days

The grid has six rows of seven cells, 42 days in all, whatever the month. The first cell holds the latest date, on or before the first day of the shown month, that falls on the weekday **FirstDay** names. A month therefore starts in the first row, and the cells before its first day hold the last days of the month before. Each cell shows the day of the month at its top left corner, in **GridFont**. The cell of the selected date, **Value**, is filled with a fixed warm grey (`&H82868E`) and has a black line along its left and top edges.

All the text of the control is drawn in the same near-black, whatever the colour properties say: the days of the month before and the month after are not grey, and the title is not in **TitleFontColor**. See [Known problems](#known-problems-in-version-1070).

**ShowVerticalGrid** and **ShowHorizontalGrid** switch the lines between the cells on and off, and **GridCellEffect** and **GridLinesColor** decide how the lines look. A black frame of one pixel always surrounds the row of day names and the grid, whichever lines are on.

A cell is selected only when its date is equal to **Value**. A **Value** with a time of day other than midnight, such as `#3/15/2026 2:30:00 PM#`, is equal to no cell, so no cell is drawn as selected. **Value** keeps the time, and **Day**, **Month** and **Year** return the parts of the date.

### Disabled state

When **Enabled** is **False**, the two lists are disabled and drawn in grey, and the row of day names has the background `&HEEEEEE` in place of **DayBackColor**. With **Flat** lines, the grid lines are `&H5B5B5B` in place of **GridLinesColor**. **BackColor** is the same as for an enabled control, and the text keeps its colour.

A disabled control does not receive the mouse or the keyboard from the user, and the focus cannot be given to it. Code can still change its date, for example with **NextDay** or **Value**.

## Choosing a date

### With the mouse

Pressing the left mouse button on a cell of the grid selects the date of that cell. The control raises **BeforeUpdate**, which can cancel the selection, then moves the selection and redraws, and raises **AfterUpdate**. A day of the month before or the month after is selected in the same way, and the control then shows its month; no **NewMonth** or **NewYear** event is raised for that change of month. A click with the right button, and a click on the title area or the row of day names, select nothing: they raise **MouseUp** and **Click** only.

A press near the right edge or the bottom edge of the grid can select a date that the grid does not show: see [Known problems](#known-problems-in-version-1070).

### With the keyboard

The control handles these keys while the keyboard focus is in the control. A click on the control gives it the focus, and Tab does not: see [Known problems](#known-problems-in-version-1070).

| Key | Effect | Method it calls |
|:----|:-------|:----------------|
| Left arrow | selects the day before | **PreviousDay** |
| Right arrow | selects the day after | **NextDay** |
| Up arrow | selects the day one week before | **PreviousWeek** |
| Down arrow | selects the day one week after | **NextWeek** |
| Page Up | selects the same day one month before | **PreviousMonth** |
| Page Down | selects the same day one month after | **NextMonth** |
| Shift, Ctrl or Alt with Page Up | selects the same day one year before | **PreviousYear** |
| Shift, Ctrl or Alt with Page Down | selects the same day one year after | **NextYear** |
| Home | selects today | **Today** |

Ctrl and Alt step by a year as Shift does. Other keys, End among them, change nothing.

**KeyDown** is raised once for each key, handled or not, after the selection has moved, so a handler that reads **Value** gets the new date. A character key raises **KeyDown**, **KeyPress** and **KeyUp**, in that order. An arrow key, a Page key, Home and End raise **KeyDown** and **KeyUp**. Tab raises **KeyPress** and **KeyUp**, and no **KeyDown**.

### By program

Setting **Value**, **Day**, **Month** or **Year**, and calling the methods that move the selection (**NextDay**, **PreviousMonth**, **Today** and the others), change the selection without raising any event: **BeforeUpdate**, **AfterUpdate**, **NewMonth**, **NewYear**, **Click** and **KeyDown** are not raised.

## What raises the events

| What happens | Events raised, in order |
|:-------------|:------------------------|
| The user clicks a day with the left button | **MouseMove** (when the pointer moved), **BeforeUpdate**, **AfterUpdate**, **MouseUp**, **Click** |
| The user clicks with the right button, or on the title or a day name | **MouseMove** (when the pointer moved), **MouseUp**, **Click** |
| The user double-clicks a day | **BeforeUpdate**, **AfterUpdate**, **MouseUp**, **Click**, **DblClick**, **MouseUp** |
| The user chooses a month in the month list | **NewMonth** |
| The user chooses a year in the year list | **NewYear** |
| The user presses a key with the focus in the control | **KeyDown**, **KeyPress**, **KeyUp** (see [With the keyboard](#with-the-keyboard)) |
| The program changes the selection or the shown month | none |

**MouseDown** is declared but never raised.

## Known problems in version 1.0.7.0

> [!WARNING]
> Version 1.0.7.0 of the package stops the program, or gives a wrong result without an error, in these cases.
>
> - **A month or a year chosen from a list can hang the program.** Choosing a month in which the selected day does not exist, such as February when the selected day is the 31st, or the year 2025 when the selected date is February 29, 2024, makes the program run at full processor load and never return. The same dates set from code raise run-time error 13 instead.
> - **The control asks to be painted again after every paint while the date selectors are shown**, a few hundred times a second, so a program that calls **DoEvents** does not come back from it, and the processor is busy. With **ShowDateSelectors** **False** it stops.
> - **The colour properties of the text have no effect.** **DayFontColor**, **GridFontColor** and **TitleFontColor** are stored and returned, but the day names, the day numbers and the title are always drawn in the same near-black (`&H4`), and so are the days of the month before and the month after, which the control means to draw in grey. The disabled state has no effect on the text colour either.
> - **Setting Value to a date in another month, or setting FirstDay, does not place the dates of the grid again.** After **Value** is set, the title and the two lists show the new month, but the grid still shows the dates of the month before, with no cell selected. After **FirstDay** is set, the day names move to the new order and the dates do not, so the names and the dates disagree. **Refresh** does not correct either. The dates are placed again when the selection is next moved, by a click on a cell, by **Today** or by one of the **Next** and **Previous** methods.
> - **A press near the right edge or the bottom edge can select a date that the grid does not show.** In a control 255 pixels wide, a cell is 36.43 pixels, which the control takes as 36, and a press at 252 to 254 pixels from the left selects the date of a column after the last, the first date of the next row. In a control 292 pixels high, a press at 290 or 291 pixels from the top selects a date a row below the grid.
> - **A flat grid is drawn near-black with the default GridLinesColor.** With **GridCellEffect** **Flat**, the default `&H80000010`, the system colour **vbButtonShadow**, is drawn as `&H10`, a near-black, and not as grey. A colour given as an RGB value, such as `RGB(255, 0, 0)`, is drawn as it is.
> - **Year, Month and Day can disagree with Value.** See [Adding the control to a form](#adding-the-control-to-a-form).
> - **A year outside 1900 to 2100 is not shown in the year list.** Setting **Year** or **Value** to 1899 or earlier leaves the year list blank, and to 2101 or later leaves it as it was. No error is raised, and **Value** and the title show the year.

> [!NOTE]
> Version 1.0.7.0 of the package has these other problems. Each raises an error, or concerns how the control looks or is reached.
>
> - **Setting ValueIsNull raises run-time error 438**, *Object doesn't support this property or method*, to **True** or to **False**. The value is stored all the same, and nothing else in the control uses it.
> - **A day, month or year that makes an impossible date raises run-time error 13**, *Type mismatch*: **Day** 0 or 32, or 31 in a month of 30 days, **Month** 13 or 0, **Month** 2 when **Day** is 31, **Year** 2025 when the selected date is February 29, 2024. The property then returns the value assigned and **Value** keeps its old date, until the next valid assignment. After a **Month** of 13, **Refresh** raises an error (-2147352567, *Exception occurred.*) until **Month** is set to a valid value.
> - **Tab never moves the keyboard focus to the control**, so a user who does not click on it cannot reach the arrow keys. A click on the control, and a choice in either list, give it the focus.
> - **MouseDown is never raised.**
> - **The title is centred in the width of the control less 140 pixels**, also when the date selectors are not shown, so it stands left of the centre.
> - **The two lists are 80 and 50 pixels wide at any DPI.** At 144 DPI the month list shows `Octobe` for October, and the year list `20` for 2026.

## Properties

A property is read and written as *object*.**Name** [ = *value* ]. The properties are listed in alphabetical order. A default is the value of a property when the control is placed on a form.

### BackColor
{: .no_toc }

The background colour of the title area and of the cells of the grid, apart from the selected cell. **OLE_COLOR**. Default: light grey (`&HE0E0E0`).

### Day
{: .no_toc }

The day of the month of the selected date, from 1 to 31. **Integer**. Default: the day of the month on which the control was placed on the form.

Setting **Day** selects that day of the shown month and year, and redraws the control. A day that the shown month does not have, such as 31 in June, or a value below 1 or above 31, raises run-time error 13, *Type mismatch*. **Day** then returns the value assigned, and **Value** is unchanged. See [Known problems](#known-problems-in-version-1070).

### DayBackColor
{: .no_toc }

The background colour of the row of day names. **OLE_COLOR**. Default: light blue (`&HDCA86F`, red 111, green 168, blue 220).

### DayFont
{: .no_toc }

The font of the day names. A **Font** object. Default: Arial, 8 points.

The control keeps the object that is assigned, not a copy of it. Assigning a font with **Set** redraws the control. A change to a property of the object after that, such as its **Size**, is shown at the next paint, which the change itself causes, so **Refresh** is not needed. Two properties that are assigned the same object share it, and a change to the object changes both.

### DayFontColor
{: .no_toc }

The colour of the day names. **OLE_COLOR**. Default: black. The value is stored, and it has no effect on the colour of the text: see [Known problems](#known-problems-in-version-1070).

### DayLength
{: .no_toc }

How much of each weekday name the row of day names shows. A [**DayLengthEnum**](#daylengthenum) member. Default: **MediumLength**.

A value other than **ShortLength** and **MediumLength** shows the whole name.

### DaysMargin
{: .no_toc }

The space above and below the day names, in device pixels. **Integer**. Default: `5`. The height of the row of day names is the height of its text plus twice this value. At 144 DPI, raising the value from 5 to 15 moves the bottom edge of the row down by 20 pixels, twice the change, so the value is not scaled with the DPI.

### Enabled
{: .no_toc }

Whether the control responds to the user. **Boolean**. Default: **True**. A disabled control is drawn as the [disabled state](#disabled-state) describes, and the user cannot reach it with the mouse or the keyboard.

### FirstDay
{: .no_toc }

The weekday of the first column of the grid. A [**WeekDaysEnum**](#weekdaysenum) member. Default: **Monday**.

Changing **FirstDay** at run time moves the day names at once, but the dates of the grid are placed again only when the selection next moves, so the names and the dates disagree until then. **Refresh** does not correct it. See [Known problems](#known-problems-in-version-1070). A value outside 0 to 7 raises run-time error 5, *Invalid procedure call or argument*, and **FirstDay** returns the value assigned.

### GridCellEffect
{: .no_toc }

How the lines between the cells look. A [**GridCellEffectEnum**](#gridcelleffectenum) member. Default: **Raised**.

With **Flat** the lines are drawn in **GridLinesColor**, one line between two cells. **Raised** and **Sunken** draw each line in black or white, and a second line of the other colour one pixel to the right of a vertical line and one pixel below a horizontal one: for **Raised** the line is black and the second white, for **Sunken** the reverse. **GridLinesColor** has no effect with **Raised** and **Sunken**.

### GridFont
{: .no_toc }

The font of the day numbers in the grid. A **Font** object. Default: Arial, 8 points. The remarks for [**DayFont**](#dayfont) apply.

### GridFontColor
{: .no_toc }

The colour of the day numbers. **OLE_COLOR**. Default: dark blue (`&HA00000`, blue 160). The value is stored, and it has no effect on the colour of the text: see [Known problems](#known-problems-in-version-1070).

### GridLinesColor
{: .no_toc }

The colour of the lines of the grid when **GridCellEffect** is **Flat**. **OLE_COLOR**. Default: `&H80000010`, the system colour [**vbButtonShadow**](../../VBRUN/Constants/SystemColorConstants). The default is drawn as near-black, and not as the system colour: see [Known problems](#known-problems-in-version-1070).

### Month
{: .no_toc }

The month of the selected date, from 1 to 12. **Integer**. Default: the month in which the control was placed on the form.

Setting **Month** selects the same day of that month in the shown year, shows the month, and updates the month list. A month number outside 1 to 12, or a month that lacks the selected day (**Day** is 31 and the month has 30 days), raises run-time error 13, *Type mismatch*. **Month** then returns the value assigned, and **Value** and the month list are unchanged. See [Known problems](#known-problems-in-version-1070).

### MonthLength
{: .no_toc }

How much of the month name the title shows. A [**MonthLengthEnum**](#monthlengthenum) member. Default: **LongLength**.

A value other than **ShortLength** shows the whole name.

### ShowDateSelectors
{: .no_toc }

Whether the month list and the year list are shown. **Boolean**. Default: **True**.

While the lists are shown the control is painted again continuously, and the title is centred in the width less 140 pixels whether or not they are shown. See [Known problems](#known-problems-in-version-1070).

### ShowDays
{: .no_toc }

Whether the row of day names is shown. **Boolean**. Default: **True**.

### ShowHorizontalGrid
{: .no_toc }

Whether the horizontal lines between the rows of the grid are drawn. **Boolean**. Default: **True**.

### ShowTitle
{: .no_toc }

Whether the title, the month and the year as text, is drawn. **Boolean**. Default: **True**. With **ShowTitle** **False** and **ShowDateSelectors** **True**, the title area keeps its height and shows only the two lists.

### ShowVerticalGrid
{: .no_toc }

Whether the vertical lines between the columns of the grid are drawn. **Boolean**. Default: **True**.

### TitleFont
{: .no_toc }

The font of the title. A **Font** object. Default: Arial, 16 points. The remarks for [**DayFont**](#dayfont) apply.

### TitleFontColor
{: .no_toc }

The colour of the title. **OLE_COLOR**. Default: orange (`&H80FF&`, red 255, green 128, blue 0). The value is stored, and it has no effect on the colour of the text: see [Known problems](#known-problems-in-version-1070).

### TitleMargin
{: .no_toc }

The space above and below the title, in device pixels. **Integer**. Default: `5`. The height of the title area is the height of the title text plus twice this value. At 144 DPI, raising the value from 5 to 15 moves the top edge of the row of day names down by 20 pixels, twice the change.

### Value
{: .no_toc }

The selected date. A **Date**. Default: the date on which the control was placed on the form.

Setting **Value** changes **Year**, **Month** and **Day** to the parts of the date, updates the two lists, and redraws the control. The time of day of the date is kept, and a **Value** with a time of day selects no cell. Setting **Value** raises no event. A String that is a date is converted; a String that is not a date raises run-time error 13, *Type mismatch*, and **Null** raises error 94.

When the new date is in a month other than the shown one, the title and the lists show the new month, and the grid keeps the dates of the month it showed before, with no cell selected, until the selection next moves. See [Known problems](#known-problems-in-version-1070).

### ValueIsNull
{: .no_toc }

**Boolean**. Default: **False**.

Setting the property raises run-time error 438, *Object doesn't support this property or method*. The value is stored all the same, and nothing else in the control uses it: it has no effect on **Value** or on how the control is drawn. See [Known problems](#known-problems-in-version-1070).

### ValueStr
{: .no_toc }

The selected date as a **String**. Reading it returns **Value** as **CStr** converts it: the short date of the regional settings, such as `3/15/2026` with US regional settings, followed by the time, such as `2:30:00 PM`, only when **Value** has a time of day. Setting it converts the string with **CDate** and assigns the result to **Value**. A string that **CDate** cannot read, an empty string among them, raises run-time error 13, *Type mismatch*.

The source marks the property as temporary: it is there until the property page can edit a date.

### Year
{: .no_toc }

The year of the selected date. **Integer**. Default: the year in which the control was placed on the form.

Setting **Year** selects the same day and month in that year, shows the year, and updates the year list, which holds 1900 to 2100. A year that lacks the selected day (**Day** is 29, **Month** is 2, and the year is not a leap year) raises run-time error 13, *Type mismatch*; **Year** then returns the value assigned, and **Value** is unchanged. A year outside 1900 to 2100 raises no error, but it is not in the year list. See [Known problems](#known-problems-in-version-1070).

## Methods

A method is called as *object*.**Name**. None takes an argument or returns a value. The methods that move the selection show the month of the new date, update the two lists, and raise no event. They do not check that the new date is in the range of the year list, 1900 to 2100: past either end, **Value** and the title follow, and the year list is blank before 1900 and unchanged after 2100.

> [!WARNING]
> In BETA 1005, [**DateAdd**](../../../Modules/DateTime/DateAdd) with the interval `"m"`, `"q"` or `"yyyy"` does not stop at the end of a shorter month: the date overflows into the next month. **NextMonth**, **PreviousMonth**, **NextYear** and **PreviousYear** call **DateAdd**, so in BETA 1005 **NextMonth** from January 31, 2026 selects March 3, 2026, **PreviousMonth** from March 31, 2026 selects March 3, 2026, and **NextYear** from February 29, 2024 selects March 1, 2025. VB6 gives the last day of the shorter month in every such case: February 28, 2026 for the first one.

### NextDay
{: .no_toc }

Selects the day after the selected one.

### NextMonth
{: .no_toc }

Selects the same day one month after the selected one, or the last day of that month when it has no such day, so January 31 gives February 28 or 29. The change stays: **NextMonth** from February 28 gives March 28, not March 31. In BETA 1005 the result differs for the 29th to the 31st: see the warning at the start of this section.

### NextWeek
{: .no_toc }

Selects the day seven days after the selected one.

### NextYear
{: .no_toc }

Selects the same day one year after the selected one, or February 28 when the selected day is February 29 and the next year is not a leap year. In BETA 1005 the result differs for February 29: see the warning at the start of this section.

### PreviousDay
{: .no_toc }

Selects the day before the selected one.

### PreviousMonth
{: .no_toc }

Selects the same day one month before the selected one. The remarks for [**NextMonth**](#nextmonth) apply, and so does the warning at the start of this section.

### PreviousWeek
{: .no_toc }

Selects the day seven days before the selected one.

### PreviousYear
{: .no_toc }

Selects the same day one year before the selected one. The remarks for [**NextYear**](#nextyear) apply, and so does the warning at the start of this section.

### Refresh
{: .no_toc }

Draws the control again. It does not place the dates of the grid again, and so does not correct a grid that disagrees with the day names or with **Value** (see [Known problems](#known-problems-in-version-1070)).

### Today
{: .no_toc }

Selects today's date, and shows its month. The time of day of **Value** is kept: with **Value** at 3:30 PM on another day, **Today** gives today at 3:30 PM.

```tb check_build
Private Sub ShowMoves()
    xCalendar1.Value = #6/15/2026#
    xCalendar1.NextMonth       ' July 15, 2026
    xCalendar1.PreviousYear    ' July 15, 2025
    xCalendar1.NextWeek        ' July 22, 2025
    xCalendar1.Today
    Debug.Print xCalendar1.Value
End Sub
```

## Events

An event is handled by a procedure named *control*\_*event*, such as `xCalendar1_AfterUpdate`.

### AfterUpdate
{: .no_toc }

Raised after a left click on a day has moved the selection.

Syntax: *object*\_**AfterUpdate**( )

### BeforeUpdate
{: .no_toc }

Raised when the user clicks a day, before the selection is moved.

Syntax: *object*\_**BeforeUpdate**( *Cancel* **As Integer** )

*Cancel*
: Passed in as `0`. Set to any value other than `0`, such as **True**, to cancel the selection: the date and the drawing are not changed and **AfterUpdate** is not raised. **MouseUp** and **Click** are still raised. The event does not say which date was clicked, and **Value** is still the date selected before.

```tb check_build
Private SelectionLocked As Boolean

Private Sub xCalendar1_BeforeUpdate(Cancel As Integer)
    If SelectionLocked Then Cancel = True
End Sub

Private Sub xCalendar1_AfterUpdate()
    Debug.Print "Selected " & xCalendar1.Value
End Sub
```

### Click
{: .no_toc }

Raised when the user clicks the control with any mouse button, after the button is released, on a day or elsewhere.

Syntax: *object*\_**Click**( )

### DblClick
{: .no_toc }

Raised when the user double-clicks the control, after the first **Click** and before the second **MouseUp**.

Syntax: *object*\_**DblClick**( )

### KeyDown
{: .no_toc }

Raised for each key pressed while the control has the focus, Tab excepted, after the control has handled the keys listed in [With the keyboard](#with-the-keyboard). A key pressed with Alt held raises it with Alt in *Shift*.

Syntax: *object*\_**KeyDown**( *KeyCode* **As Integer**, *Shift* **As Integer** )

*KeyCode*
: The [key code](../../VBRUN/Constants/KeyCodeConstants) of the key.

*Shift*
: The state of the Shift, Ctrl and Alt keys, as [**ShiftConstants**](../../VBRUN/Constants/ShiftConstants) gives it.

### KeyPress
{: .no_toc }

Raised when the user presses a key that produces a character, Enter, Space and Tab among them.

Syntax: *object*\_**KeyPress**( *KeyAscii* **As Integer** )

*KeyAscii*
: The character code of the key.

### KeyUp
{: .no_toc }

Raised when the user releases a key.

Syntax: *object*\_**KeyUp**( *KeyCode* **As Integer**, *Shift* **As Integer** )

The parameters are those of [**KeyDown**](#keydown).

### MouseDown
{: .no_toc }

Declared, and never raised. A handler for it is never called. See [Known problems](#known-problems-in-version-1070).

Syntax: *object*\_**MouseDown**( *Button* **As Integer**, *Shift* **As Integer**, *X* **As Single**, *Y* **As Single** )

### MouseMove
{: .no_toc }

Raised when the pointer moves over the control.

Syntax: *object*\_**MouseMove**( *Button* **As Integer**, *Shift* **As Integer**, *X* **As Single**, *Y* **As Single** )

*Button*
: The mouse buttons that are down.

*Shift*
: The state of the Shift, Ctrl and Alt keys.

*X*, *Y*
: The position of the pointer in device pixels, from the top left corner of the control. The values are not scaled to the size of the control at design time: at 144 DPI a control that is 256 pixels wide at design time is 384 pixels wide, and a press 192 pixels from its left edge gives *X* 192.

### MouseUp
{: .no_toc }

Raised when the user releases a mouse button over the control.

Syntax: *object*\_**MouseUp**( *Button* **As Integer**, *Shift* **As Integer**, *X* **As Single**, *Y* **As Single** )

The parameters are those of [**MouseMove**](#mousemove).

### NewMonth
{: .no_toc }

Raised after the user chooses a month in the month list, once the selection has moved to the same day of that month.

Syntax: *object*\_**NewMonth**( )

A change of month by any other means, such as a click on a day of another month, a key, a method or a property, does not raise it. Choosing a month in which the selected day does not exist can hang the program: see [Known problems](#known-problems-in-version-1070).

### NewYear
{: .no_toc }

Raised after the user chooses a year in the year list.

Syntax: *object*\_**NewYear**( )

A change of year by any other means does not raise it. Choosing a year in which the selected day does not exist, February 29 in a year that is not a leap year, can hang the program: see [Known problems](#known-problems-in-version-1070).

## Enumerations

### DayLengthEnum
{: .no_toc }

The value of [**DayLength**](#daylength).

| Member | Value | Shows |
|:-------|------:|:------|
| **ShortLength** | 0 | the first letter, such as `M` |
| **MediumLength** | 1 | the first three letters, such as `Mon` |
| **LongLength** | 2 | the whole name, such as `Monday` |

### GridCellEffectEnum
{: .no_toc }

The value of [**GridCellEffect**](#gridcelleffect).

| Member | Value | Lines |
|:-------|------:|:------|
| **Flat** | 0 | one line in **GridLinesColor** |
| **Raised** | 1 | a black line and a white line beside it |
| **Sunken** | 2 | a white line and a black line beside it |

### MonthLengthEnum
{: .no_toc }

The value of [**MonthLength**](#monthlength).

| Member | Value | Shows |
|:-------|------:|:------|
| **ShortLength** | 0 | the first three letters, such as `Oct` |
| **LongLength** | 1 | the whole name, such as `October` |

### WeekDaysEnum
{: .no_toc }

The value of [**FirstDay**](#firstday). The values are those of the [**VbDayOfWeek**](../../../Modules/Constants/VbDayOfWeek) constants.

| Member | Value |
|:-------|------:|
| **Sunday** | 1 |
| **Monday** | 2 |
| **Tuesday** | 3 |
| **Wednesday** | 4 |
| **Thursday** | 5 |
| **Friday** | 6 |
| **Saturday** | 7 |

```tb check_build
Private Sub Form_Load()
    With xCalendar1
        .FirstDay = WeekDaysEnum.Sunday
        .DayLength = DayLengthEnum.LongLength
        .MonthLength = MonthLengthEnum.ShortLength
        .GridCellEffect = GridCellEffectEnum.Flat
        .GridLinesColor = RGB(200, 200, 200)
        .DayBackColor = RGB(220, 230, 241)
        .ShowHorizontalGrid = False
    End With
End Sub
```

## See Also

- [Importing a package from TWINSERV](../../../../Features/Packages/Importing-TWINSERV) -- adding a published package to a project
- [Toolbox](../../../IDE/Project/Toolbox) -- placing a control on a form
- [MonthView](../../WinNativeCommonCtls/MonthView) class -- the month calendar of the Windows common controls
- [DTPicker](../../WinNativeCommonCtls/DTPicker) class -- the date and time picker of the same package
