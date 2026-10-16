VERSION 5.00
Begin VB.UserControl UC1
   ClientHeight    =   1000
   ClientLeft      =   0
   ClientTop       =   0
   ClientWidth     =   1000
   ScaleHeight     =   1000
   ScaleWidth      =   1000
End
Attribute VB_Name = "UC1"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = True
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Option Explicit

Public Sub RunCases()
    On Error Resume Next
    UserControl.ForeColor = vbGreen
    UserControl.ForeColor = -1
    Print #9, "UserControl.ForeColor = -1: Err " & Err.Number & ", reads " & Hex$(UserControl.ForeColor): Err.Clear
    UserControl.BackColor = vbGreen
    UserControl.BackColor = -1
    Print #9, "UserControl.BackColor = -1: Err " & Err.Number & ", reads " & Hex$(UserControl.BackColor): Err.Clear
    UserControl.FillColor = vbGreen
    UserControl.FillColor = -1
    Print #9, "UserControl.FillColor = -1: Err " & Err.Number & ", reads " & Hex$(UserControl.FillColor): Err.Clear
End Sub
