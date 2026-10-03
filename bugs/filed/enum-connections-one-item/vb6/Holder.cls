VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
END
Attribute VB_Name = "Holder"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Option Explicit

' Each Holder with a WithEvents variable set to the source is one connection.
Private WithEvents Src As Source

Public Sub Attach(ByVal Target As Source)
    Set Src = Target
End Sub

Private Sub Src_Ping()
End Sub
