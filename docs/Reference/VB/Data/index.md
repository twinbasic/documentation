---
title: Data
parent: VB Package
permalink: /tB/Packages/VB/Data/
has_toc: false
---

# Data class
{: .no_toc }

A **Data** control is a Win32 native control that opens a DAO database and exposes a single recordset to other controls on the form through data binding. It draws a strip of four arrow-shaped buttons — **Move-First**, **Move-Previous**, **Move-Next**, **Move-Last** — with a centred [**Caption**](#caption) between them, and lets the user step through the recordset with the mouse. The control is normally placed on a **Form** or **UserControl** at design time. Setting [**DatabaseName**](#databasename) and [**RecordSource**](#recordsource) is enough to populate it; the recordset opens automatically the first time the control is created. The default event is [**Validate**](#validate); the control has no usable default property.

```tb
Private Sub Form_Load()
    With Data1
        .DatabaseName = App.Path & "\biblio.mdb"
        .RecordSource = "Authors"
        .Caption = "Authors"
    End With
    Set Text1.DataSource = Data1
    Text1.DataField = "Author"
End Sub

Private Sub Data1_Reposition()
    Me.Caption = "Author " & (Data1.Recordset.AbsolutePosition + 1)
End Sub
```

* TOC
{:toc}

## Connecting to a database

[**DefaultType**](#defaulttype) selects the database engine ([**DatabaseTypeConstants**](../../VBRUN/Constants/DatabaseTypeConstants)):

| Constant       | Value | Engine                                               |
|----------------|-------|------------------------------------------------------|
| **vbUseJet**   | 2     | Microsoft Jet (the classic VB6 default).             |
| **vbUseODBC**  | 1     | An ODBC data source.                                 |
| **vbUseACE**   | 3     | The Microsoft Access ACE engine. New in twinBASIC.   |

[**DatabaseName**](#databasename) gives the path to the database file (for Jet/ACE) or the DSN (for ODBC); [**Connect**](#connect) is the connection string. The Jet-flavoured default `"Access 2000;"` is rewritten to `"MS Access;"` before the database is opened, matching the VB6 behaviour. [**Exclusive**](#exclusive) and [**ReadOnly**](#readonly) are passed through to **OpenDatabase**, and [**Options**](#options) is the DAO option bit-mask. [**DefaultCursorType**](#defaultcursortype) is consulted only when **DefaultType** is **vbUseODBC**.

[**RecordSource**](#recordsource) is the table name (or SQL statement) opened against the database, and [**RecordsetType**](#recordsettype) chooses between table, dynaset, and snapshot ([**RecordsetTypeConstants**](../../VBRUN/Constants/RecordsetTypeConstants)). Calling [**Refresh**](#refresh) reopens the recordset using the current values of these properties — typically after one of them is changed at run time.

The opened objects are exposed read-only as [**Database**](#database) and read/write as [**Recordset**](#recordset). Assigning a new value to **Recordset** disconnects from the current database, adopts the new recordset, and re-binds every dependent control.

## Bound controls

Other controls become *data-bound* by setting their **DataSource** to this **Data** control and their **DataField** to the name of a field in [**Recordset**](#recordset). A bound control reads its value from that field whenever the current record changes, and writes user edits back into the field as part of the next save. The **Data** control mediates both directions, raising [**Reposition**](#reposition) after the bound controls have re-synced and [**Validate**](#validate) before any operation that would discard pending edits.

```tb
' At design time you would normally set these in the property sheet,
' but they can also be assigned in code:
Set txtTitle.DataSource = Data1
txtTitle.DataField = "Title"
Set chkInPrint.DataSource = Data1
chkInPrint.DataField = "InPrint"
```

## Navigation and end-of-file behaviour

The four buttons step through the recordset with **MoveFirst**, **MovePrevious**, **MoveNext**, and **MoveLast**. [**BOFAction**](#bofaction) controls what happens when the user moves past the first record ([**DataBOFconstants**](../../VBRUN/Constants/DataBOFconstants)): **vbMoveFirst** (default) snaps back to the first record; **vbBOF** lets the recordset sit on the BOF marker. [**EOFAction**](#eofaction) controls what happens past the last record ([**DataEOFConstants**](../../VBRUN/Constants/DataEOFConstants)): **vbMoveLast** (default), **vbEOF**, or **vbAddNew** — which clears every bound control and starts a new record.

## The validate / save cycle

Whenever the control is about to leave the current record — through a navigation button, a programmatic move, **Refresh**, **Update**, **Delete**, or unloading the form — it fires [**Validate**](#validate) with an *Action* argument from [**DataValidateConstants**](../../VBRUN/Constants/DataValidateConstants) and a *Save* flag indicating whether bound controls hold unsaved edits. Setting *Action* to **vbDataActionCancel** (0) cancels the operation and keeps the current record. If *Save* is non-zero on return and the operation proceeds, the bound controls are flushed back into the recordset before the move occurs.

[**Reposition**](#reposition) is raised after a successful move, with the bound controls already showing the new record. [**UpdateControls**](#updatecontrols) re-pulls the current record into the bound controls without firing **Reposition**, and [**UpdateRecord**](#updaterecord) is reserved for explicit save-without-move (currently unimplemented).

## Properties

### Appearance
{: .no_toc }

Determines how the control's border is drawn by the OS. A member of [**AppearanceConstants**](../../VBRUN/Constants/AppearanceConstants): **vbAppearFlat** or **vbAppear3d** (default).

### BackColor
{: .no_toc }

The fill colour of the band behind the [**Caption**](#caption), as an **OLE_COLOR**. Defaults to the system window-background colour.

### BOFAction
{: .no_toc }

Controls what happens when the user moves past the start of the recordset. A member of [**DataBOFconstants**](../../VBRUN/Constants/DataBOFconstants): **vbMoveFirst** (0, default — snap back to the first record) or **vbBOF** (1 — let the recordset sit on the beginning-of-file marker, leaving bound controls cleared).

### Caption
{: .no_toc }

The text drawn in the band between the navigation buttons. **String**, default `"Data"`. The string is read directly from the underlying window — assigning to **Caption** is reflected immediately.

Syntax: *object*.**Caption** [ = *string* ]

### CausesValidation
{: .no_toc }

Determines whether the previously focused control's **Validate** event runs before this control receives the focus. **Boolean**, default **True**. This refers to the *previous* control's validation; for the **Data** control's own [**Validate**](#validate) event, see the [validate / save cycle](#the-validate--save-cycle) section above.

### Connect
{: .no_toc }

The connection string passed to **OpenDatabase**. **String**, default `"Access 2000;"`. The default value is rewritten to `"MS Access;"` before the database is opened, matching the VB6 behaviour. Used together with [**DatabaseName**](#databasename), [**Exclusive**](#exclusive), [**ReadOnly**](#readonly), and [**Options**](#options).

### ControlType
{: .no_toc }

A read-only [**ControlTypeConstants**](../../VBRUN/Constants/ControlTypeConstants) value identifying this control as a Data control. Always **vbDataControl**.

### Database
{: .no_toc }

The currently open DAO database. Read-only — assign to [**Recordset**](#recordset) or call [**Refresh**](#refresh) to change it.

### DatabaseName
{: .no_toc }

The path to the database file (for **vbUseJet** and **vbUseACE**) or the DSN (for **vbUseODBC**). **String**. Combined with [**Connect**](#connect), [**Exclusive**](#exclusive), [**ReadOnly**](#readonly), and [**Options**](#options) to open the database the first time the control is realised, or whenever [**Refresh**](#refresh) is called.

### DefaultCursorType
{: .no_toc }

The cursor driver to use when [**DefaultType**](#defaulttype) is **vbUseODBC**. A member of [**DefaultCursorTypeConstants**](../../VBRUN/Constants/DefaultCursorTypeConstants): **vbUseDefaultCursor** (0, default), **vbUseODBCCursor** (1), or **vbUseServersideCursor** (2). Ignored for Jet and ACE connections.

### DefaultType
{: .no_toc }

The database engine to use. A member of [**DatabaseTypeConstants**](../../VBRUN/Constants/DatabaseTypeConstants): **vbUseJet** (2, default), **vbUseODBC** (1), or **vbUseACE** (3 — new in twinBASIC, uses the Access ACE engine). Read once when the recordset is opened.

### DragIcon
{: .no_toc }

A **StdPicture** used as the mouse cursor while the control is being drag-and-dropped (see [**Drag**](#drag) and [**DragMode**](#dragmode)).

### DragMode
{: .no_toc }

Whether the control should drag itself when the user holds the mouse over it. A member of [**DragModeConstants**](../../VBRUN/Constants/DragModeConstants): **vbManual** (0, default — call [**Drag**](#drag) from code) or **vbAutomatic** (1).

### Enabled
{: .no_toc }

Determines whether the control accepts user input. A disabled **Data** control still shows its caption but draws the navigation buttons dimmed and ignores keyboard and mouse interaction. **Boolean**, default **True**.

### EOFAction
{: .no_toc }

Controls what happens when the user moves past the end of the recordset. A member of [**DataEOFConstants**](../../VBRUN/Constants/DataEOFConstants): **vbMoveLast** (0, default — snap back to the last record), **vbEOF** (1 — sit on the end-of-file marker), or **vbAddNew** (2 — clear all bound controls and start a new record ready for editing).

### Exclusive
{: .no_toc }

When **True**, the database is opened with exclusive access (no other process or **Data** control can open it). **Boolean**, default **False**.

### Font
{: .no_toc }

The **StdFont** used to render [**Caption**](#caption). The convenience properties **FontName**, **FontSize**, **FontBold**, **FontItalic**, **FontStrikethru**, and **FontUnderline** read or write the corresponding members of this object.

### ForeColor
{: .no_toc }

The text colour for the caption, as an **OLE_COLOR**. Defaults to the system window-text colour. A disabled control draws the caption in the system grey-text colour instead.

### Height
{: .no_toc }

The control's height, in twips by default (or in the container's **ScaleMode** units). **Single**.

### hWnd
{: .no_toc }

The Win32 window handle for the underlying control, as a **LongPtr**. Read-only. Useful for passing to API functions.

### Index
{: .no_toc }

When the control is part of a control array, the **Long** zero-based index of this instance within the array. Read-only at run time.

### Left
{: .no_toc }

The horizontal distance from the left edge of the container to the left edge of the control. **Single**.

### MouseIcon
{: .no_toc }

A **StdPicture** used as the mouse cursor when [**MousePointer**](#mousepointer) is **vbCustom** and the pointer is over the control.

### MousePointer
{: .no_toc }

The mouse cursor shown when the pointer is over the control. A member of [**MousePointerConstants**](../../VBRUN/Constants/MousePointerConstants).

### Name
{: .no_toc }

The unique design-time name of the control on its parent form. Read-only at run time.

### Negotiate
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC.

### OLEDropMode
{: .no_toc }

How the control responds to OLE drops. A restricted member of [**OLEDropConstants**](../../VBRUN/Constants/OLEDropConstants): **vbOLEDropNone** or **vbOLEDropManual**. Automatic-drop mode is not supported on a **Data** control.

### Options
{: .no_toc }

A bit-mask of DAO **OpenRecordset** options (e.g. `dbReadOnly`, `dbAppendOnly`, `dbDenyWrite`). **Long**, default `0`. Read once when the recordset is opened.

### Parent
{: .no_toc }

A reference to the **Form** (or **UserControl**) that contains this control. Read-only.

### ReadOnly
{: .no_toc }

When **True**, the database is opened read-only and edits to bound fields are prevented. **Boolean**, default **False**. Note that this is a reserved word in twinBASIC and must be referenced through a member access (`Data1.ReadOnly`) or escaped (`[ReadOnly]`) in declarations.

### Recordset
{: .no_toc }

The DAO recordset currently populating the bound controls. **Object** (a `DAO.Recordset` at run time).

Syntax: *object*.**Recordset** [ = *recordset* ]

Reading **Recordset** returns the open recordset, or **Nothing** if the control has not yet connected. Setting **Recordset** with **Set** detaches from the current database, adopts the supplied recordset (and its parent database), copies its [**DatabaseName**](#databasename), [**Connect**](#connect), [**ReadOnly**](#readonly), [**RecordsetType**](#recordsettype), and [**RecordSource**](#recordsource) values back onto the control, re-binds every dependent field, and raises [**Reposition**](#reposition).

### RecordsetType
{: .no_toc }

The kind of recordset to open. A member of [**RecordsetTypeConstants**](../../VBRUN/Constants/RecordsetTypeConstants): **vbRSTypeTable** (0), **vbRSTypeDynaset** (1, default), or **vbRSTypeSnapShot** (2). Read once when the recordset is opened.

### RecordSource
{: .no_toc }

The table name, query name, or SQL statement that supplies the recordset. **String**. Read once when the recordset is opened.

### RightToLeft
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC.

### TabIndex
{: .no_toc }

The position of the control in the form's TAB-key navigation order. **Long**.

### TabStop
{: .no_toc }

Whether the user can reach the control by pressing the **TAB** key. **Boolean**, default **True**. A disabled control is skipped regardless of this setting.

### Tag
{: .no_toc }

A free-form **String** the application can use to associate custom data with the control. Ignored by the framework.

### ToolTipText
{: .no_toc }

A multi-line **String** displayed as a tooltip when the user hovers over the control.

### Top
{: .no_toc }

The vertical distance from the top of the container to the top of the control. **Single**.

### Visible
{: .no_toc }

Whether the control is shown. **Boolean**, default **True**.

### VisualStyles
{: .no_toc }

Whether the OS theme engine should be used when drawing the navigation buttons. **Boolean**, default **True**.

### WhatsThisHelpID
{: .no_toc }

A **Long** identifying a "What's This?" help-pop-up topic in the application's help file. See [**ShowWhatsThis**](#showwhatsthis).

### Width
{: .no_toc }

The control's width. **Single**.

## Methods

### Drag
{: .no_toc }

Begins, completes, or cancels a manual drag-and-drop operation. Typically called from a [**MouseDown**](#mousedown) handler when [**DragMode**](#dragmode) is **vbManual**.

Syntax: *object*.**Drag** [ *Action* ]

*Action*
: *optional* A member of [**DragConstants**](../../VBRUN/Constants/DragConstants): **vbCancel** (0), **vbBeginDrag** (1, default), or **vbEndDrag** (2).

### Move
{: .no_toc }

Repositions and optionally resizes the control in a single call.

Syntax: *object*.**Move** *Left* [, *Top* [, *Width* [, *Height* ] ] ]

*Left*
: *required* A **Single** giving the new horizontal position.

*Top*, *Width*, *Height*
: *optional* New values for the corresponding properties. Omitted values are left unchanged.

### OLEDrag
{: .no_toc }

Initiates an OLE drag operation from the control, raising the [**OLEStartDrag**](#olestartdrag) event so the application can populate the **DataObject**.

Syntax: *object*.**OLEDrag**

### Refresh
{: .no_toc }

Saves any pending edits in bound controls, closes the current recordset, and reopens it from the current values of [**DatabaseName**](#databasename), [**Connect**](#connect), [**RecordSource**](#recordsource), [**RecordsetType**](#recordsettype), [**Exclusive**](#exclusive), [**ReadOnly**](#readonly), and [**Options**](#options). Bound controls are then re-synced and [**Reposition**](#reposition) is raised.

Syntax: *object*.**Refresh**

### SetFocus
{: .no_toc }

Moves the input focus to the control. The control must be both [**Visible**](#visible) and [**Enabled**](#enabled), or run-time error 5 (*Invalid procedure call or argument*) is raised.

Syntax: *object*.**SetFocus**

### ShowWhatsThis
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC.

Displays the topic identified by [**WhatsThisHelpID**](#whatsthishelpid) as a "What's This?" pop-up.

Syntax: *object*.**ShowWhatsThis**

### UpdateControls
{: .no_toc }

Re-reads the values of the current record into every bound control, discarding any unsaved edits. Useful as a manual "revert" when validation has rejected an edit. Does not raise [**Reposition**](#reposition).

Syntax: *object*.**UpdateControls**

### UpdateRecord
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC. In VB6 this saves bound-control edits to the recordset without firing [**Validate**](#validate). Until it is implemented, force a save by calling **Recordset.Update** directly, or trigger a navigation/refresh that goes through the [validate / save cycle](#the-validate--save-cycle).

Syntax: *object*.**UpdateRecord**

### ZOrder
{: .no_toc }

Brings the control to the front or back of its sibling stack.

Syntax: *object*.**ZOrder** [ *Position* ]

*Position*
: *optional* A member of [**ZOrderConstants**](../../VBRUN/Constants/ZOrderConstants): **vbBringToFront** (0, default) or **vbSendToBack** (1).

## Events

### DragDrop
{: .no_toc }

Raised on the destination control when a manual drag operation ends over it.

Syntax: *object*\_**DragDrop**( *Source* **As Control**, *X* **As Single**, *Y* **As Single** )

### DragOver
{: .no_toc }

Raised on the control under the cursor while a manual drag operation is in progress.

Syntax: *object*\_**DragOver**( *Source* **As Control**, *X* **As Single**, *Y* **As Single**, *State* **As Integer** )

### Error
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently raised in twinBASIC. In VB6 this event is raised when an asynchronous DAO operation fails outside of a code path the application can intercept; it is not needed for synchronous errors that arise through normal `On Error` handling.

Syntax: *object*\_**Error**( *DataErr* **As Integer**, *Response* **As Integer** )

### Initialize
{: .no_toc }

Raised once, immediately after the underlying window is created and before the recordset is opened. Useful for setting [**DatabaseName**](#databasename), [**RecordSource**](#recordsource), or [**Connect**](#connect) from code in time for the first connection. New in twinBASIC — VB6 had no equivalent on the **Data** control.

Syntax: *object*\_**Initialize**( )

### MouseDown
{: .no_toc }

Raised when the user presses any mouse button over the control.

Syntax: *object*\_**MouseDown**( *Button* **As Integer**, *Shift* **As Integer**, *X* **As Single**, *Y* **As Single** )

### MouseMove
{: .no_toc }

Raised when the cursor moves over the control.

Syntax: *object*\_**MouseMove**( *Button* **As Integer**, *Shift* **As Integer**, *X* **As Single**, *Y* **As Single** )

### MouseUp
{: .no_toc }

Raised when the user releases a mouse button over the control.

Syntax: *object*\_**MouseUp**( *Button* **As Integer**, *Shift* **As Integer**, *X* **As Single**, *Y* **As Single** )

### MouseWheel
{: .no_toc }

Raised when the mouse wheel turns over the control. New in twinBASIC.

Syntax: *object*\_**MouseWheel**( *Delta* **As Integer**, *Horizontal* **As Boolean** )

### OLECompleteDrag
{: .no_toc }

Raised on the source control when the OLE drag operation finishes, indicating which effect (copy, move, none) the destination accepted.

Syntax: *object*\_**OLECompleteDrag**( *Effect* **As Long** )

### OLEDragDrop
{: .no_toc }

Raised on the destination control when the user drops data on it.

Syntax: *object*\_**OLEDragDrop**( *Data* **As DataObject**, *Effect* **As Long**, *Button* **As Integer**, *Shift* **As Integer**, *X* **As Single**, *Y* **As Single** )

### OLEDragOver
{: .no_toc }

Raised on the destination control while an OLE drag passes over it.

Syntax: *object*\_**OLEDragOver**( *Data* **As DataObject**, *Effect* **As Long**, *Button* **As Integer**, *Shift* **As Integer**, *X* **As Single**, *Y* **As Single**, *State* **As Integer** )

### OLEGiveFeedback
{: .no_toc }

Raised on the source control during a drag so the application can adjust the cursor or other visual feedback.

Syntax: *object*\_**OLEGiveFeedback**( *Effect* **As Long**, *DefaultCursors* **As Boolean** )

### OLESetData
{: .no_toc }

Raised on the source control when the destination requests data in a format that was registered but not yet supplied.

Syntax: *object*\_**OLESetData**( *Data* **As DataObject**, *DataFormat* **As Integer** )

### OLEStartDrag
{: .no_toc }

Raised on the source control at the start of an OLE drag, so the application can populate the **DataObject** and choose the allowed effects.

Syntax: *object*\_**OLEStartDrag**( *Data* **As DataObject**, *AllowedEffects* **As Long** )

### Reposition
{: .no_toc }

Raised after the current record has changed — through a navigation button, a programmatic move on [**Recordset**](#recordset), an assignment to **Recordset**, or [**Refresh**](#refresh) — and after every bound control has been re-synced to the new record. The point at which to update derived UI such as a "Record *n* of *m*" caption.

Syntax: *object*\_**Reposition**( )

### Resize
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently raised in twinBASIC.

Syntax: *object*\_**Resize**( )

### Validate
{: .no_toc }

Raised before any operation that would leave the current record — a navigation button, a programmatic move, **Update**, **Delete**, **Refresh**, **Find**, an **AddNew**, an explicit close, or unloading the form. **Default event.**

Syntax: *object*\_**Validate**( *Action* **As Integer**, *Save* **As Integer** )

*Action*
: A member of [**DataValidateConstants**](../../VBRUN/Constants/DataValidateConstants) identifying the operation that triggered validation. Setting *Action* to **vbDataActionCancel** (0) cancels the operation and keeps the current record.

*Save*
: Non-zero on entry when bound controls hold unsaved edits. Set it to zero before returning to discard those edits without writing them back; leave it non-zero to flush them into the recordset before the operation proceeds.
