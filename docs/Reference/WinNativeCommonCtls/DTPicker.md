---
title: DTPicker
parent: WinNativeCommonCtls Package
permalink: /tB/Packages/WinNativeCommonCtls/DTPicker
has_toc: false
---

# DTPicker class
{: .no_toc }

A **DTPicker** is a date / time picker control. The inline field shows the current date or time formatted per [**Format**](#format); clicking the dropdown arrow opens a [**MonthView**](MonthView)-style calendar for picking a new date, and dismissing the calendar updates [**Value**](#value).

```tb
Private Sub Form_Load()
    DTPicker1.Format = dtpShortDate
    DTPicker1.MinDate = DateSerial(2020, 1, 1)
    DTPicker1.MaxDate = DateSerial(2030, 12, 31)
    DTPicker1.Value = Date
End Sub

Private Sub DTPicker1_Change()
    Debug.Print "User picked: " & DTPicker1.Value
End Sub
```

The control inherits the focusable rect-dockable members from `BaseControlFocusable` — size, position, **Anchors**, **Dock**, **Font**, **BackColor** / **ForeColor**, **Appearance**, **MousePointer** / **MouseIcon**, **ToolTipText**, **DragMode** / **DragIcon**, **Drag**, **Refresh**, **SetFocus**, **TabIndex** / **TabStop**, **ZOrder**, **CausesValidation**, **VisualStyles**, **hWnd**, **HelpContextID** / **WhatsThisHelpID**.

* TOC
{:toc}

## Format and value

[**Format**](#format) selects one of four display styles — long date, short date, time, or a custom format string supplied through [**CustomFormat**](#customformat). The inline value is always a **Date**, but [**Value**](#value) is typed **Variant** because a [**CheckBox**](#checkbox)-equipped picker may have no date assigned (the user can clear the checkbox), in which case [**Value**](#value) reads as **Null**.

The convenience accessors [**Year**](#year), [**Month**](#month), [**Week**](#week), [**Day**](#day), [**Hour**](#hour), [**Minute**](#minute), and [**Second**](#second) decompose the current value into individual components; assigning to any of them rewrites [**Value**](#value) with the requested component changed. The [**StartOfWeek**](#startofweek) property selects the first-day-of-week used by the calendar dropdown and by [**Week**](#week).

## Custom format and callback events

When [**Format**](#format) is set to **dtpCustom**, the [**CustomFormat**](#customformat) string controls the display. The format syntax follows the Win32 `GetDateFormat` / `GetTimeFormat` picture string (e.g. `"dddd, MMMM dd, yyyy"`). Tokens enclosed in callback markers (`X` literals in the format) raise the [**Format**](#format-event), [**FormatSize**](#formatsize), and [**CallbackKeyDown**](#callbackkeydown) events so the application can render its own field content and respond to keyboard navigation across it.

## Calendar appearance

When the dropdown calendar is shown, the [**CalendarBackColor**](#calendarbackcolor), [**CalendarForeColor**](#calendarforecolor), [**CalendarTitleBackColor**](#calendartitlebackcolor), [**CalendarTitleForeColor**](#calendartitleforecolor), and [**CalendarTrailingForeColor**](#calendartrailingforecolor) properties control the calendar's colors via `DTM_SETMCCOLOR`. The [**CalendarShowToday**](#calendarshowtoday), [**CalendarShowTodayCircle**](#calendarshowtodaycircle), [**CalendarShowWeekNumbers**](#calendarshowweeknumbers), and [**CalendarShowTrailingDates**](#calendarshowtrailingdates) booleans toggle the corresponding `MCS_…` style flags on the embedded calendar.

[**hWndCalendar**](#hwndcalendar) returns the Win32 handle of the dropped-down calendar window — useful for advanced customization. It is only valid between the [**DropDown**](#dropdown) and [**CloseUp**](#closeup) events.

Properties
----------

### CalendarBackColor
{: .no_toc }

The calendar dropdown's background color. **OLE_COLOR**. Default: **vbWindowBackground**. Applied to the embedded month calendar via `DTM_SETMCCOLOR` / `MCSC_MONTHBK`.

### CalendarForeColor
{: .no_toc }

The calendar dropdown's text color. **OLE_COLOR**. Default: **vbButtonText**.

### CalendarShowToday
{: .no_toc }

Whether the calendar dropdown shows the "Today: …" string at the bottom. **Boolean**. Default: **True**.

### CalendarShowTodayCircle
{: .no_toc }

Whether the calendar dropdown highlights today's date with a circle. **Boolean**. Default: **True**.

### CalendarShowTrailingDates
{: .no_toc }

Whether the calendar dropdown shows the leading and trailing days of the previous and next month. **Boolean**. Default: **True**.

### CalendarShowWeekNumbers
{: .no_toc }

Whether the calendar dropdown shows a week-number column on the left. **Boolean**. Default: **False**.

### CalendarTitleBackColor
{: .no_toc }

The calendar dropdown's title bar background color. **OLE_COLOR**. Default: **vb3DFace**.

### CalendarTitleForeColor
{: .no_toc }

The calendar dropdown's title bar text color. **OLE_COLOR**. Default: **vbButtonText**.

### CalendarTrailingForeColor
{: .no_toc }

The text color used for trailing days from adjacent months when [**CalendarShowTrailingDates**](#calendarshowtrailingdates) is **True**. **OLE_COLOR**. Default: **vbGrayText**.

### CheckBox
{: .no_toc }

Whether the picker includes a checkbox next to the date value. **Boolean**. Default: **False**. When **True**, the user can clear the checkbox to leave the picker without a value, in which case [**Value**](#value) returns **Null**. Assigning **Null** to [**Value**](#value) when **CheckBox** is **False** raises run-time error 35787 (*"Can't set Value to NULL when CheckBox property = FALSE"*).

Changing this property at run time recreates the underlying Win32 window — the property cannot be flipped in the GWL_STYLE alone.

### CustomFormat
{: .no_toc }

The picture string used when [**Format**](#format) is **dtpCustom**. **String**. Default: empty. Follows the Win32 `GetDateFormat` syntax (e.g. `"dddd, MMMM dd, yyyy"`, `"hh:mm:ss tt"`).

### Day
{: .no_toc }

The day-of-month component of [**Value**](#value). **Integer** (1–31). Reading returns the current day; assigning rewrites the date with the new day, raising run-time error 380 if the assigned value is out of range for the current month. See also [**DayCount**](#daycount).

### DayCount
{: .no_toc }

The number of days in the current value's month. **Long**, read-only. Computed from [**Year**](#year) and [**Month**](#month). Useful for bounds-checking before assigning [**Day**](#day).

### DayOfWeek
{: .no_toc }

The day-of-week the current [**Value**](#value) falls on, as a [**VbDayOfWeek**](../../Modules/Constants/VbDayOfWeek) member (`vbSunday` through `vbSaturday`). Read-only.

### Format
{: .no_toc }

The display format. A member of [**DTPickerFormatConstants**](Enumerations/DTPickerFormatConstants): **dtpLongDate**, **dtpShortDate**, **dtpTime**, **dtpCustom**. Default: **dtpShortDate**.

### Hour
{: .no_toc }

The hour component of [**Value**](#value), in 24-hour form. **Integer** (1–23 — note that `0` is rejected with run-time error 380 by the setter; read returns the live value). Reading is unrestricted.

### hWndCalendar
{: .no_toc }

The Win32 handle of the dropped-down calendar window. **HWND**, read-only. Valid only between the [**DropDown**](#dropdown) and [**CloseUp**](#closeup) events; reads as 0 when the calendar is closed.

### MaxDate
{: .no_toc }

The upper bound of the navigable date range. **Date**. Default: `9999-12-31`. Assigning a value lower than [**MinDate**](#mindate) raises run-time error 35775. If the current [**Value**](#value) exceeds the new **MaxDate**, [**Value**](#value) is clamped down to **MaxDate**.

### MinDate
{: .no_toc }

The lower bound of the navigable date range. **Date**. Default: `1601-01-01`. Assigning a value higher than [**MaxDate**](#maxdate) raises run-time error 35775. If the current [**Value**](#value) is below the new **MinDate**, [**Value**](#value) is clamped up to **MinDate**.

### Minute
{: .no_toc }

The minute component of [**Value**](#value). **Integer** (1–59 on assignment; 0–59 on read).

### Month
{: .no_toc }

The month-of-year component of [**Value**](#value). **Integer** (1–12). Assigning an out-of-range value raises run-time error 380.

### RightToLeft
{: .no_toc }

> [!NOTE]
> **RightToLeft** is tagged `[Unimplemented]` and has no effect; reading and writing the property compiles but the underlying Win32 control's RTL mode is not switched.

A **Boolean**.

### Second
{: .no_toc }

The seconds component of [**Value**](#value). **Integer** (1–59 on assignment; 0–59 on read).

### StartOfWeek
{: .no_toc }

Which day of the week is rendered as the leftmost column in the calendar dropdown. A [**VbDayOfWeek**](../../Modules/Constants/VbDayOfWeek) member. Defaults to the system's first-day-of-week setting (resolved through `vbUseSystemDayOfWeek`).

### UpDown
{: .no_toc }

Whether the picker uses a spin-button widget instead of a dropdown calendar. **Boolean**. Default: **False**. When **True**, the user adjusts the date by clicking up / down arrows next to each field; the calendar dropdown is suppressed.

Changing this property at run time recreates the underlying Win32 window.

### Value
{: .no_toc }

The selected date / time. **Variant**. The default member.

Reads as a **Date** when the checkbox is checked (or [**CheckBox**](#checkbox) is **False**) or **Null** when the checkbox is cleared. Assigning **Null** when [**CheckBox**](#checkbox) is **False** raises run-time error 35787. Assigning a date outside [[**MinDate**](#mindate), [**MaxDate**](#maxdate)] raises run-time error 35773.

Assigning a numeric (non-**Date**) value implicitly converts via **CDate**. Assigning **Empty** is treated the same as assigning **Null**. Changing [**Value**](#value) fires [**Change**](#change) once the control is past its initialization phase.

### Week
{: .no_toc }

The ISO-style week-of-year for the current [**Value**](#value). **Integer** (1–53). The setter applies a delta of `DateAdd("ww", …)` so changing **Week** preserves the day-of-week within the week. Assigning out-of-range raises run-time error 380. Honors [**StartOfWeek**](#startofweek) when computing the week boundary.

### Year
{: .no_toc }

The year component of [**Value**](#value). **Integer**.

Events
------

### CallbackKeyDown
{: .no_toc }

Raised when the user presses a key while a custom callback field is focused. Lets the application interpret the key (e.g. arrow-up / arrow-down to cycle through enum values) and rewrite the date.

Syntax: *object*\_**CallbackKeyDown**( **ByVal** *KeyCode* **As Integer**, **ByVal** *Shift* **As Integer**, **ByVal** *CallbackField* **As String**, *CallbackDate* **As Date** )

*KeyCode*
: A [**KeyCodeConstants**](../VBRUN/Constants/KeyCodeConstants) value identifying the pressed key.

*Shift*
: A bitmask of [**ShiftConstants**](../VBRUN/Constants/ShiftConstants) values.

*CallbackField*
: The picture-string token identifying which callback field is focused.

*CallbackDate*
: **In / out** — the current value the application can mutate before the event returns.

### Change
{: .no_toc }

Raised when [**Value**](#value) has changed, either by user interaction or by code. Does not fire during the initial property-deserialization pass at form load.

Syntax: *object*\_**Change**( )

### Click
{: .no_toc }

Raised on a mouse click inside the control's rectangle.

Syntax: *object*\_**Click**( )

### CloseUp
{: .no_toc }

Raised when the dropdown calendar closes — either by the user picking a date, by clicking outside the calendar, or by pressing **Esc**.

Syntax: *object*\_**CloseUp**( )

### DblClick
{: .no_toc }

Raised on a double-click inside the control's rectangle.

Syntax: *object*\_**DblClick**( )

### DragDrop
{: .no_toc }

Inherited drag-drop event. See [**DragMode**](../VB/CheckBox#dragmode).

### DragOver
{: .no_toc }

Inherited drag-drop event.

### DropDown
{: .no_toc }

Raised when the dropdown calendar opens. The handler can use [**hWndCalendar**](#hwndcalendar) to customize the dropped-down calendar window.

Syntax: *object*\_**DropDown**( )

### Format
{: #format-event .no_toc }

Raised for each custom callback field that needs rendering, when [**Format**](#format) is **dtpCustom** and the [**CustomFormat**](#customformat) string contains callback tokens.

Syntax: *object*\_**Format**( **ByVal** *CallbackField* **As String**, *FormattedString* **As String** )

*CallbackField*
: The picture-string token identifying which callback field is being rendered.

*FormattedString*
: **Out** — the application sets this to the text the picker should display in the field.

### FormatSize
{: .no_toc }

Raised before [**Format**](#format-event) to ask how many character cells to reserve for the callback field. The picker uses the current [**Font**](../VB/CheckBox#font) to measure the rendered width.

Syntax: *object*\_**FormatSize**( **ByVal** *CallbackField* **As String**, *Size* **As Integer** )

*CallbackField*
: The picture-string token identifying the callback field.

*Size*
: **Out** — the application sets this to the expected character count.

### GotFocus
{: .no_toc }

Inherited focus event.

### Initialize
{: .no_toc }

Raised after the control's window has been created and its properties initialised from persisted state. Fires once per form-load.

Syntax: *object*\_**Initialize**( )

### LostFocus
{: .no_toc }

Inherited focus event.

### MouseDown
{: .no_toc }

Inherited mouse event.

Syntax: *object*\_**MouseDown**( *Button* **As Integer**, *Shift* **As Integer**, *X* **As Single**, *Y* **As Single** )

### MouseMove
{: .no_toc }

Inherited mouse event.

### MouseUp
{: .no_toc }

Inherited mouse event.

### OLECompleteDrag, OLEDragDrop, OLEDragOver, OLEGiveFeedback, OLESetData, OLEStartDrag
{: .no_toc }

Inherited OLE drag-and-drop events. See [**OLEDropConstants**](../VBRUN/Constants/OLEDropConstants) for the **OLEDropMode** values.

### Validate
{: .no_toc }

Inherited validation event. Set *Cancel* to **True** to keep focus on the control.

Syntax: *object*\_**Validate**( *Cancel* **As Boolean** )

## See Also

- [MonthView](MonthView) -- the full-month calendar control; **DTPicker**'s dropdown uses the same underlying Win32 control
- [DTPickerFormatConstants](Enumerations/DTPickerFormatConstants) -- the **Format** values
- [ControlTypeConstants](../VBRUN/Constants/ControlTypeConstants) -- where **vbDTPicker** lives
