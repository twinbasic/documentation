---
title: IVBPrint
parent: VB Package
permalink: /tB/Packages/VB/IVBPrint
---

# IVBPrint interface
{: .no_toc }

The interface the [**Print**](../../Core/Print) statement dispatches through. A class that implements **IVBPrint** becomes a valid **Print** target, so `myObject.Print "a", "b"` compiles and runs against it.

This is how [**Form**](Form/), [**PictureBox**](PictureBox/), [**Printer**](Printer/), [**PropertyPage**](PropertyPage/), [**Report**](Report/) and [**UserControl**](UserControl/) accept **Print**: the first five implement it on the shared drawing base, and **Printer** implements it and forwards to that base.

> [!NOTE]
> **IVBPrint** is an internal interface and may change in future BETA releases. It is declared **Private** inside the VB package, so reaching it from a project means exposing the package's private symbols through its [library symbol](../../../Features/Packages/Library-Symbols), which is not the default --- see [Implementing it](#implementing-it) below.

## Members

**WriteText**
: Syntax: **WriteText**( *Value* **As String** )

  Writes a chunk of already-formatted text at the current print position. The statement calls this once per expression, and once more with the line terminator unless a trailing separator suppressed it.

**Column**
: Syntax: *object*.**Column** [ = *value* ]

  The current print column, as a **Long**. The statement reads it to find where it has got to, and assigns it to move to a new column --- which is what a comma, **Tab(***n***)** or **Spc(***n***)** does.

  A column is whatever the implementer decides it is worth. The VB drawing classes convert between a column and **CurrentX** using the font's average character width, rounding up when reporting, which is why print zones stay aligned in a proportional font.

## The dispatch protocol

**Print** evaluates the expressions and does the column arithmetic itself, then drives the target. For `myObject.Print "a", "b"` the calls are, in order:

```tb inert=excerpt
WriteText("a")        ' the first expression
Column                ' read  -- returns 0
Column = 14           ' write -- the comma moves to the next print zone
WriteText("b")        ' the second expression
WriteText(vbCrLf)     ' the line ends, since there is no trailing separator
```

Two things follow from this that are worth knowing.

The statement **never pads the text with spaces**. Capturing everything handed to **WriteText** above yields `ab`, with nothing between the fields; the gap a reader sees is produced by the target when it honours the new **Column**. On the Debug Console that means emitting spaces, and on a drawing surface it means moving the pen.

The column arithmetic is done **in columns**, not in pixels or characters. The statement asks for column 14 and leaves it to the target to decide where column 14 falls.

## Implementing it

A class implements the three members and gains **Print**:

```tb check_build project=vb-private projname=ivbprint-sink
Class PrintSink

    Implements VB.IVBPrint

    Private m_buf As String
    Private m_col As Long

    Private Sub SinkWriteText(ByVal Value As String) _
            Implements VB.IVBPrint.WriteText
        m_buf = m_buf & Value
    End Sub

    Private Property Get SinkColumn() As Long _
            Implements VB.IVBPrint.Column
        Return m_col
    End Property

    Private Property Let SinkColumn(ByVal Value As Long) _
            Implements VB.IVBPrint.Column
        m_col = Value
    End Property

    Public Function Text() As String
        Return m_buf
    End Function

End Class
```

Used like any other **Print** target:

```tb check_build project=vb-private projname=ivbprint-sink
Dim Sink As New PrintSink
Sink.Print "a", "b"
Debug.Print Sink.Text()
```

Two things have to be right, and the compiler reports the same error for both.

**Expose the package's private symbols.** In *Project Settings* → *Library References*, on the **Enabled Libraries** tab, click the pencil beside the VB package's library symbol and prefix it with an asterisk --- `*VB`. The asterisk is the instruction, not part of the name; see [Library symbols](../../../Features/Packages/Library-Symbols). Without it the interface is invisible.

**Qualify the name.** `Implements IVBPrint` on its own does not resolve even after that; write `VB.IVBPrint`, or whatever the library symbol has been renamed to. With the symbol set to `*MyVB`, the declaration is `Implements MyVB.IVBPrint`.

Get either wrong and every mention fails with *TB5079 Unrecognized datatype symbol 'IVBPrint'*.

## See Also

- [**Print** statement](../../Core/Print) -- the statement this interface serves
- [**Debug.Print**](../../Modules/Debug#print) -- the Debug Console target
- [print zone](../../Gloss#print-zone) in the glossary
