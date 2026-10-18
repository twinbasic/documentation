Filed as [twinbasic/twinbasic#2519](https://github.com/twinbasic/twinbasic/issues/2519).

## `ListItem.BackColor` raises error 380 when it is assigned its own default, -1, so a row that has a colour cannot return to the list's colour

**Describe the bug**
The `BackColor` of a ListItem (WinNativeCommonCtls) defaults to `-1`, which means "use the ListView's `BackColor`" (`SUPPORT/ListItem.twin`: `Public BackColor As OLE_COLOR = -1`, with the comment `CLR_NONE`). Assigning `-1` to a row that has been given a colour raises error 380, *Invalid property value*. The row keeps its colour, so once a row has a colour of its own there is no way back to the list's colour.
The cause is `BackColorChanged`, which calls `VB.CommonValidateColorOrRevert`. In BETA 1005 that function refuses `-1` (the change that made every colour property of the VB controls refuse a value that is not a colour); `-1` is the one value this property uses on purpose. Assigning `-1` to a new item, which already holds `-1`, raises nothing, because nothing changes.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `listitem-backcolor-default-refused.twinproj` (attached as `listitem-backcolor-default-refused.zip`). `Form1` holds one ListView, `ListView1`, and the module `ListItemBackColorTests` holds the test cases.
2. Run, with `On Error Resume Next`:
   ```
   Load Form1
   Set item = Form1.ListView1.ListItems.Add(, , "row")
   item.BackColor = vbYellow
   item.BackColor = -1
   Debug.Print Err.Number, item.BackColor
   ```
3. See `380` and `65535`. Expected `0` and `-1`.

The module below is the reproducer's, and is meant to be adapted as a regression test. On BETA 1005 the first four cases pass and the last fails with `Expected: 0, Actual: 380`.
```vb
[TestFixture]
Module ListItemBackColorTests

    Private Const UseListColour As Long = -1

    [TestCase]
    Public Sub DefaultIsUseListColour()
        Dim item As ListItem, value As Long
        Load Form1
        Set item = Form1.ListView1.ListItems.Add(, , "row")
        value = item.BackColor
        Unload Form1
        Assert.Strict.AreEqual UseListColour, value, "the default"
    End Sub

    [TestCase]
    Public Sub ColourIsAccepted()
        Dim item As ListItem, number As Long, value As Long
        Load Form1
        Set item = Form1.ListView1.ListItems.Add(, , "row")
        On Error Resume Next: item.BackColor = vbYellow: number = Err.Number: On Error GoTo 0
        value = item.BackColor
        Unload Form1
        Assert.Strict.AreEqual 0, number, "the error"
        Assert.Strict.AreEqual CLng(vbYellow), value, "the colour"
    End Sub

    [TestCase]
    Public Sub DefaultAssignedToNewItem()
        Dim item As ListItem, number As Long, value As Long
        Load Form1
        Set item = Form1.ListView1.ListItems.Add(, , "row")
        On Error Resume Next: item.BackColor = UseListColour: number = Err.Number: On Error GoTo 0
        value = item.BackColor
        Unload Form1
        Assert.Strict.AreEqual 0, number, "the error"
        Assert.Strict.AreEqual UseListColour, value, "the colour"
    End Sub

    [TestCase]
    Public Sub ColourIsKeptWhenDefaultIsAssigned()
        Dim item As ListItem, value As Long
        Load Form1
        Set item = Form1.ListView1.ListItems.Add(, , "row")
        item.BackColor = vbYellow
        On Error Resume Next: item.BackColor = UseListColour: On Error GoTo 0
        value = item.BackColor
        Unload Form1
        Assert.Strict.AreEqual True, (value = CLng(vbYellow) Or value = UseListColour), "yellow or the list's colour"
    End Sub

    [TestCase]
    Public Sub DefaultAssignedAfterColour()
        Dim item As ListItem, number As Long, value As Long
        Load Form1
        Set item = Form1.ListView1.ListItems.Add(, , "row")
        item.BackColor = vbYellow
        On Error Resume Next: item.BackColor = UseListColour: number = Err.Number: On Error GoTo 0
        value = item.BackColor
        Unload Form1
        Assert.Strict.AreEqual 0, number, "the error"
        Assert.Strict.AreEqual UseListColour, value, "the colour"
    End Sub

End Module
```

**Expected behavior**
Assigning `-1` to `ListItem.BackColor` is accepted and the row is drawn in the ListView's `BackColor` again, as for a new row. `-1` is the property's default and its documented meaning, so the colour check has to let it through for this property (the controls of the VB package have no such value, and refusing it there is right). MSCOMCTL's ListItem has no `BackColor`, so VB6 has nothing to compare.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1005

**Additional context**
A ListItem's `ForeColor` defaults to a system colour, not to -1, so the same check does no harm there. Severity: low. A program can only give a row a colour that looks like the list's, and the row is not changed by the refused assignment.

<!-- Reproducer: bugs/listitem-backcolor-default-refused/ (mode test; expect is the four PASS lines and the FAIL line of DefaultAssignedAfterColour, verified on BETA 1005 by `bug_repro.mjs verify`). Page: docs/Reference/Built-In/WinNativeCommonCtls/ListView/ListItem.md carries the callout, its BackColor NOTE labelled BETA 1005; remove it when a fix is released. Found 2026-10-14 while documenting WinNativeCommonCtls colours. -->
