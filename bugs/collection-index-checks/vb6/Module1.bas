Attribute VB_Name = "Module1"
Option Explicit

' The VB6 side of bugs/collection-index-checks: the cases of src/Sources/RegressionTests.twin,
' in the same order, each printing the error VB6 raises (0: none). Build and run it with:
'     node scripts/bug_repro.mjs vb6 collection-index-checks

Private Function Two() As Collection
    Set Two = New Collection
    Two.Add "a"
    Two.Add "b"
End Function

Private Function ItemError(ByVal C As Collection, ByVal Index As Variant) As Long
    Dim Got As Variant
    On Error Resume Next
    Got = C.Item(Index)
    ItemError = Err.Number
End Function

Private Function RemoveError(ByVal C As Collection, ByVal Index As Variant) As Long
    On Error Resume Next
    C.Remove Index
    RemoveError = Err.Number
End Function

Private Function AddBeforeError(ByVal C As Collection, ByVal Before As Variant) As Long
    On Error Resume Next
    C.Add "x", , Before
    AddBeforeError = Err.Number
End Function

Private Sub Report(ByVal Name As String, ByVal Number As Long)
    Print #9, Name & ": " & Number
End Sub

Sub Main()
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    Report "Control_ItemOfLongDoubleByte", ItemError(Two(), 2&) + ItemError(Two(), 2#) + ItemError(Two(), CByte(2))
    Report "Control_ItemOutOfRange_Raises9", ItemError(Two(), 3)
    Report "Control_ItemOfMissingKey_Raises5", ItemError(Two(), "z")
    Report "Item_Currency_ReturnsItem", ItemError(Two(), CCur(2))
    Report "Item_Decimal_ReturnsItem", ItemError(Two(), CDec(2))
    Report "Item_Date_ReturnsItem", ItemError(Two(), CDate(2))
    Report "Remove_Currency_Removes", RemoveError(Two(), CCur(2))
    Report "AddBefore_Currency_Adds", AddBeforeError(Two(), CCur(2))
    Report "Item_EmptyCollection_Raises5", ItemError(New Collection, 1)
    Report "Item_Null_Raises13", ItemError(Two(), Null)
    Report "Item_Object_Raises13", ItemError(Two(), New Collection)
    Report "Item_BeyondLong_Raises13", ItemError(Two(), 2147483648#)
    Report "Remove_Null_Raises13", RemoveError(Two(), Null)
    Report "AddBefore_MinusOne_Raises9", AddBeforeError(Two(), -1)
    Report "AddBefore_Empty_Raises9", AddBeforeError(Two(), Empty)
    Report "AddBefore_BeyondLong_Raises13", AddBeforeError(Two(), 2147483648#)
    Dim C As New Collection
    On Error Resume Next
    C.Add "x", Empty
    Report "Add_EmptyKey_Raises13", Err.Number
    On Error GoTo Fail
    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub
