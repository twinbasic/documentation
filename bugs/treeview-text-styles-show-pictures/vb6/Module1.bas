Attribute VB_Name = "Module1"
Option Explicit

' The VB6 side of the reproducer: node scripts/bug_repro.mjs vb6 treeview-text-styles-show-pictures
' The same probe as src/Sources/Startup.twin, with MSCOMCTL.OCX's TreeView and ImageList: two
' trees of the same nodes, TreeView1 with a picture on each and TreeView2 with none, each Style
' in turn, the pictures reported as drawn when TreeView1's first node has its text further right.

Private Declare Function SendMessage Lib "user32" Alias "SendMessageA" (ByVal hWnd As Long, ByVal wMsg As Long, _
    ByVal wParam As Long, ByRef lParam As Any) As Long
Private Declare Function LoadIcon Lib "user32" Alias "LoadIconA" (ByVal hInstance As Long, ByVal lpIconName As Long) As Long
Private Declare Function OleCreatePictureIndirect Lib "oleaut32" (ByRef Desc As PICTDESC, ByRef riid As GUID, _
    ByVal fOwn As Long, ByRef Pic As IPicture) As Long
Private Declare Sub Sleep Lib "kernel32" (ByVal Milliseconds As Long)

Private Type PICTDESC
    cbSizeofstruct As Long
    picType As Long
    hImage As Long
    hPal As Long
End Type

Private Type GUID
    Data1 As Long
    Data2 As Integer
    Data3 As Integer
    Data4(0 To 7) As Byte
End Type

Private Type RECT
    Left As Long
    Top As Long
    Right As Long
    Bottom As Long
End Type

Private Const TVM_GETITEMRECT As Long = &H1104
Private Const TVM_GETNEXTITEM As Long = &H110A
Private Const TVGN_ROOT As Long = 0
Private Const IDI_INFORMATION As Long = 32516
Private Const PICTYPE_ICON As Long = 3

' The system's information icon, which the picture does not own.
Private Function SystemIcon() As StdPicture
    Dim d As PICTDESC
    d.cbSizeofstruct = Len(d)
    d.picType = PICTYPE_ICON
    d.hImage = LoadIcon(0, IDI_INFORMATION)
    Dim iid As GUID
    iid.Data1 = &H7BF80980
    iid.Data2 = &HBF32
    iid.Data3 = &H101A
    iid.Data4(0) = &H8B: iid.Data4(1) = &HBB: iid.Data4(3) = &HAA
    iid.Data4(5) = &H30: iid.Data4(6) = &HC: iid.Data4(7) = &HAB
    Dim p As IPicture
    OleCreatePictureIndirect d, iid, 0, p
    Set SystemIcon = p
End Function

' Documents, holding Letters and Notes, expanded; each with the picture "info" when Pictures.
Private Sub Fill(ByVal tv As Object, ByVal Pictures As Boolean)
    Dim root As Object
    If Pictures Then
        Set root = tv.Nodes.Add(, , "docs", "Documents", "info")
        tv.Nodes.Add root, tvwChild, "letters", "Letters", "info"
        tv.Nodes.Add root, tvwChild, "notes", "Notes", "info"
    Else
        Set root = tv.Nodes.Add(, , "docs", "Documents")
        tv.Nodes.Add root, tvwChild, "letters", "Letters"
        tv.Nodes.Add root, tvwChild, "notes", "Notes"
    End If
    root.Expanded = True
End Sub

' Where the text of the tree's first node starts, in its window's pixels.
Private Function TextLeft(ByVal tv As Object) As Long
    Dim r As RECT
    r.Left = SendMessage(tv.hWnd, TVM_GETNEXTITEM, TVGN_ROOT, ByVal 0&)
    If SendMessage(tv.hWnd, TVM_GETITEMRECT, 1, r) = 0 Then
        TextLeft = -1
    Else
        TextLeft = r.Left
    End If
End Function

Private Sub Settle()
    Dim i As Long
    For i = 1 To 10
        DoEvents
        Sleep 20
    Next
End Sub

Sub Main()
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    Dim names As Variant
    names = Array("tvwTextOnly", "tvwPictureText", "tvwPlusMinusText", "tvwPlusMinusPictureText", _
        "tvwTreelinesText", "tvwTreelinesPictureText", "tvwTreelinesPlusMinusText", "tvwTreelinesPlusMinusPictureText")
    Load Form1
    Form1.ImageList1.ListImages.Add , "info", SystemIcon()
    Set Form1.TreeView1.ImageList = Form1.ImageList1
    Fill Form1.TreeView1, True
    Fill Form1.TreeView2, False
    Form1.Show
    Settle
    Dim s As Long
    For s = 0 To 7
        Form1.TreeView1.Style = s
        Form1.TreeView2.Style = s
        Settle
        Print #9, names(s) & " (" & s & "): pictures " & _
            IIf(TextLeft(Form1.TreeView1) > TextLeft(Form1.TreeView2), "drawn", "not drawn")
    Next
    Unload Form1
    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub
