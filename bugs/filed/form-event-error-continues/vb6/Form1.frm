VERSION 5.00
Begin VB.Form Form1
   Caption         =   "Form1"
   ClientHeight    =   3000
   ClientLeft      =   60
   ClientTop       =   345
   ClientWidth     =   4000
   LinkTopic       =   "Form1"
   ScaleHeight     =   3000
   ScaleWidth      =   4000
   StartUpPosition =   3  'Windows Default
End
Attribute VB_Name = "Form1"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Option Explicit

' The VB6 side of a bug reproducer: what VB6 does where the report says twinBASIC differs.
' Build and run it with:  node scripts/bug_repro.mjs vb6 form-event-error-continues
' Form1 is the startup object. The error in Form_Load is left unhandled on purpose: VB6 shows
' it and ends the program, so Form_Activate never runs and out.txt holds only "Form_Load ran".

Private Sub Form_Load()
    Open App.Path & "\out.txt" For Output As #9
    Print #9, "Form_Load ran"
    Close #9
    Err.Raise 5, "MySrc", "my text in Form_Load"
End Sub

Private Sub Form_Activate()
    Open App.Path & "\out.txt" For Append As #9
    Print #9, "Form_Activate ran after the error"
    Close #9
    Unload Me
End Sub
