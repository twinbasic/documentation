VERSION 5.00
Begin VB.Form Form1
   Caption         =   "Import Demo"
   ClientHeight    =   2400
   ClientLeft      =   60
   ClientTop       =   405
   ClientWidth     =   4200
   LinkTopic       =   "Form1"
   ScaleHeight     =   2400
   ScaleWidth      =   4200
   StartUpPosition =   3  'Windows Default
   Begin VB.CommandButton cmdGreet
      Caption         =   "Greet"
      Height          =   495
      Left            =   1440
      TabIndex        =   0
      Top             =   960
      Width           =   1335
   End
End
Attribute VB_Name = "Form1"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Option Explicit

Private Sub cmdGreet_Click()
    MsgBox Greeting(App.Title)
End Sub
