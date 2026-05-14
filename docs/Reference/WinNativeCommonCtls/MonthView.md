---
title: MonthView
parent: WinNativeCommonCtls Package
permalink: /tB/Packages/WinNativeCommonCtls/MonthView
has_toc: false
---

# MonthView class
{: .no_toc }

A **MonthView** is a full-month calendar grid: a visible matrix of [**MonthColumns**](#monthcolumns) × [**MonthRows**](#monthrows) month panels, navigable forwards and backwards through the month headers, with optional today indicator, week numbers, and bold-day highlighting through the [**GetDayBold**](#getdaybold) callback event. Unlike [**DTPicker**](DTPicker) — which shows only its inline value field and pops the calendar on demand — a **MonthView** is always visible on the form.

```tb
Private Sub Form_Load()
    MonthView1.MonthColumns = 2
    MonthView1.MonthRows = 1
    MonthView1.MultiSelect = True
    MonthView1.MaxSelCount = 7
    MonthView1.ShowWeekNumbers = True
End Sub

Private Sub MonthView1_SelChange( _
        ByVal StartDate As Date, ByVal EndDate As Date, Cancel As Boolean)
    Debug.Print "Selection: " & StartDate & " to " & EndDate
End Sub

Private Sub MonthView1_GetDayBold( _
        ByVal StartDate As Date, ByVal Count As Integer, State() As Boolean)
    Dim i As Integer
    For i = 1 To Count
        State(i) = IsHoliday(DateAdd("d", i - 1, StartDate))
    Next
End Sub
```

The control inherits the focusable rect-dockable members from `BaseControlFocusable` — size, position, **Anchors**, **Dock**, **Font**, **Appearance**, **MousePointer** / **MouseIcon**, **ToolTipText**, **Drag**, **Refresh**, **SetFocus**, **TabIndex** / **TabStop**, **ZOrder**, **CausesValidation**, **VisualStyles**, **hWnd**, **HelpContextID** / **WhatsThisHelpID**.

* TOC
{:toc}

## Multi-month layout

A **MonthView** can display more than one calendar panel at once. [**MonthColumns**](#monthcolumns) and [**MonthRows**](#monthrows) set the panel grid (default 1 × 1); when [**ResizeToFit**](#resizetofit) is **True** (the default), the control auto-sizes its **Width** and **Height** to fit the requested grid using the current [**Font**](../VB/CheckBox#font) and the [**ShowToday**](#showtoday) / [**ShowWeekNumbers**](#showweeknumbers) options. Setting **ResizeToFit** to **False** allows the application to size the control freely, with the calendar panels arranged to fit whatever space is available.

[**GetMonthRange**](#getmonthrange) returns the span of dates currently visible across all panels — useful inside [**GetDayBold**](#getdaybold) to know which days to populate.

## Single-day and multi-day selection

When [**MultiSelect**](#multiselect) is **False** (the default), the user can select one date at a time and [**Value**](#value), [**SelStart**](#selstart), and [**SelEnd**](#selend) all report the same value. When [**MultiSelect**](#multiselect) is **True**, the user can drag-select a contiguous range up to [**MaxSelCount**](#maxselcount) days wide; [**SelStart**](#selstart) and [**SelEnd**](#selend) bracket the range, and [**Value**](#value) returns [**SelStart**](#selstart).

Changing [**MultiSelect**](#multiselect) at run time recreates the underlying Win32 window — the property cannot be flipped through GWL_STYLE alone.

## Bold days for highlighting

The [**GetDayBold**](#getdaybold) event fires after every visible-range change, asking the application which days to render in bold. The application populates the *State* array with **True** / **False** for each day in the visible range; the control then caches the result until the user navigates to a different range. To force an individual day on or off without reissuing the whole event, use [**DayBold**](#dayboldday) ( *date* ) = *boolean*.

Properties
----------

### Appearance
{: .no_toc }

How the control's border is drawn. A [**AppearanceConstants**](../VBRUN/Constants/AppearanceConstants) member: **vbAppearFlat** or **vbAppear3d**. Default: **vbAppear3d**. Inherited.

### BackColor
{: .no_toc }

The main background color of the calendar panels. **OLE_COLOR**. Default: **vbWindowBackground**.

### BorderStyle
{: .no_toc }

The control's border style. A [**ControlBorderStyleConstants**](../VBRUN/Constants/ControlBorderStyleConstants) member: **vbNoBorder** or **vbFixedSingleBorder**. Default: **vbFixedSingleBorder**.

### CalendarCount
{: .no_toc }

The number of calendar panels the underlying control is rendering. **Byte**, read-only. Usually equals [**MonthColumns**](#monthcolumns) × [**MonthRows**](#monthrows).

### Day
{: .no_toc }

The day-of-month component of [**Value**](#value). **Integer** (1–31). See [**DayCount**](#daycount).

### DayBold(date)
{: #dayboldday .no_toc }

Whether a specific date in the visible range is rendered in bold. **Boolean**, read/write. The setter updates the underlying day-state bitmask and re-applies it; reading returns the live cached value.

Syntax: *object*.**DayBold**( *date* ) [ **=** *boolean* ]

*date*
: A **Date** within the currently visible range. Out-of-range dates raise run-time error 380.

### DayCount
{: .no_toc }

The number of days in the current value's month. **Long**, read-only.

### DayOfWeek
{: .no_toc }

The day-of-week the current [**Value**](#value) falls on, as a [**VbDayOfWeek**](../../Modules/Constants/VbDayOfWeek) member. Read-only.

### ForeColor
{: .no_toc }

The text color used for normal days. **OLE_COLOR**. Default: **vbButtonText**.

### MaxDate
{: .no_toc }

The upper bound of the navigable date range. **Date**. Default: `9999-12-31`. Assigning a value lower than [**MinDate**](#mindate) raises run-time error 35775.

### MaxSelCount
{: .no_toc }

The maximum number of consecutive days the user can select when [**MultiSelect**](#multiselect) is **True**. **Long**. Default: `7`.

### MinDate
{: .no_toc }

The lower bound of the navigable date range. **Date**. Default: `1753-01-01`.

### Month
{: .no_toc }

The month-of-year component of [**Value**](#value). **Integer** (1–12).

### MonthBackColor
{: .no_toc }

The background color used for the day cells. **OLE_COLOR**. Default: **vbWindowBackground**. Distinct from [**BackColor**](#backcolor), which covers the surrounding area when multiple panels are arranged.

### MonthColumns
{: .no_toc }

The number of calendar panels arranged horizontally. **Long**. Default: `1`. Changing this value triggers a resize when [**ResizeToFit**](#resizetofit) is **True**.

### MonthRows
{: .no_toc }

The number of calendar panels arranged vertically. **Long**. Default: `1`.

### MultiSelect
{: .no_toc }

Whether the user can select a contiguous range of days. **Boolean**. Default: **False**. Changing this property at run time recreates the underlying Win32 window.

### ResizeToFit
{: .no_toc }

Whether the control auto-resizes to fit the requested [**MonthColumns**](#monthcolumns) × [**MonthRows**](#monthrows) grid using the current [**Font**](../VB/CheckBox#font). **Boolean**. Default: **True**.

### RightToLeft
{: .no_toc }

> [!NOTE]
> **RightToLeft** is tagged `[Unimplemented]` and has no effect on the underlying control's rendering direction.

A **Boolean**.

### ScrollRate
{: .no_toc }

The number of months the navigation arrows scroll the visible range by. **Long**. Default: `0` — meaning "use the calendar's natural width" (typically `MonthColumns`). Pass any positive integer to override.

### SelEnd
{: .no_toc }

The end of the current selection range. **Date**, read/write. When [**MultiSelect**](#multiselect) is **False**, **SelEnd** equals [**SelStart**](#selstart) and equals [**Value**](#value).

### SelStart
{: .no_toc }

The start of the current selection range. **Date**, read/write. Equals [**Value**](#value).

### ShowToday
{: .no_toc }

Whether the calendar shows the "Today: …" line at the bottom. **Boolean**. Default: **True**.

### ShowTodayCircle
{: .no_toc }

Whether the calendar highlights today's date with a circle. **Boolean**. Default: **True**.

### ShowTrailingDates
{: .no_toc }

Whether the calendar shows the leading and trailing days of the previous and next month. **Boolean**. Default: **True**.

### ShowWeekNumbers
{: .no_toc }

Whether the calendar shows a week-number column on the left of each panel. **Boolean**. Default: **False**.

### StartOfWeek
{: .no_toc }

Which day of the week is rendered as the leftmost column. A [**VbDayOfWeek**](../../Modules/Constants/VbDayOfWeek) member. Defaults to the system's first-day-of-week setting.

### TitleBackColor
{: .no_toc }

The title bar (month name + year header) background color. **OLE_COLOR**. Default: **vbActiveTitleBar**.

### TitleForeColor
{: .no_toc }

The title bar text color. **OLE_COLOR**. Default: **vbActiveTitleBarText**.

### TrailingForeColor
{: .no_toc }

The text color used for trailing days from adjacent months when [**ShowTrailingDates**](#showtrailingdates) is **True**. **OLE_COLOR**. Default: **vbGrayText**.

### Value
{: .no_toc }

The currently selected start date. **Date**. The default member.

Reading returns [**SelStart**](#selstart). Assigning fires [**SelChange**](#selchange) (the handler can cancel the change). Assigning a date outside [[**MinDate**](#mindate), [**MaxDate**](#maxdate)] raises run-time error 35773.

### VisibleDays(sIndex)
{: .no_toc }

The date at the *sIndex*'th cell across all visible panels. **Date**, read-only.

Syntax: *object*.**VisibleDays**( *sIndex* )

*sIndex*
: A 1-based index between 1 and the total cell count returned by [**GetMonthRange**](#getmonthrange).

### Week
{: .no_toc }

The week-of-year for the current [**Value**](#value). **Integer** (1–53).

### Year
{: .no_toc }

The year component of [**Value**](#value). **Integer**.

Methods
-------

### GetMonthRange
{: .no_toc }

Returns the first and last visible date across all panels.

Syntax: *object*.**GetMonthRange** ( *IncludeTrailing*, [ *StartDate* ] [ , *EndDate* ] ) **As Long**

*IncludeTrailing*
: A **Boolean**. When **True**, the range includes the trailing days of the previous month and leading days of the next month that are rendered in the first / last panels (useful for [**GetDayBold**](#getdaybold) population). When **False**, the range covers only the days that belong to the visible month columns.

*StartDate*
: *output* A **Date** that receives the first visible date.

*EndDate*
: *output* A **Date** that receives the last visible date.

Returns the count of months in the visible range.

Events
------

### Click
{: .no_toc }

Raised on any mouse click that doesn't hit a date cell.

Syntax: *object*\_**Click**( )

### DateClick
{: .no_toc }

Raised when the user clicks a date cell. The clicked date is passed as a parameter.

Syntax: *object*\_**DateClick**( **ByVal** *DateClicked* **As Date** )

### DateDblClick
{: .no_toc }

Raised when the user double-clicks a date cell.

Syntax: *object*\_**DateDblClick**( **ByVal** *DateDblClicked* **As Date** )

### DblClick
{: .no_toc }

Raised on any double-click that doesn't hit a date cell.

Syntax: *object*\_**DblClick**( )

### DragDrop, DragOver
{: .no_toc }

Inherited drag-drop events.

### GetDayBold
{: .no_toc }

Raised for every visible range change, asking the application to populate the *State* array with the days that should be rendered in bold. The first array index is `1`; the array runs from *StartDate* through *StartDate* + *Count* − 1.

Syntax: *object*\_**GetDayBold**( **ByVal** *StartDate* **As Date**, **ByVal** *Count* **As Integer**, *State*( ) **As Boolean** )

*StartDate*
: The first day in the visible range (including trailing days of the previous month).

*Count*
: The total number of days in the visible range.

*State*
: An array of **Boolean**, 1-indexed, that the handler sets to **True** for each day that should be bold.

### GotFocus, LostFocus
{: .no_toc }

Inherited focus events.

### Initialize
{: .no_toc }

Raised after the control's window has been created and properties initialised from persisted state. Fires once per form-load.

### KeyDown, KeyPress, KeyUp
{: .no_toc }

Inherited keyboard events.

### MouseDown, MouseMove, MouseUp
{: .no_toc }

Inherited mouse events.

### OLECompleteDrag, OLEDragDrop, OLEDragOver, OLEGiveFeedback, OLESetData, OLEStartDrag
{: .no_toc }

Inherited OLE drag-and-drop events.

### SelChange
{: .no_toc }

Raised when the selection has changed. Set *Cancel* to **True** to roll the selection back to the previous range (the control restores the old [**SelStart**](#selstart) / [**SelEnd**](#selend)).

Syntax: *object*\_**SelChange**( **ByVal** *StartDate* **As Date**, **ByVal** *EndDate* **As Date**, *Cancel* **As Boolean** )

### Validate
{: .no_toc }

Inherited validation event.

## See Also

- [DTPicker](DTPicker) -- the inline date picker whose dropdown uses the same Win32 calendar control
- [ControlTypeConstants](../VBRUN/Constants/ControlTypeConstants) -- where **vbMonthView** lives
