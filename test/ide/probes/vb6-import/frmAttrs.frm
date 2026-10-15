VERSION 5.00
Begin VB.Form frmAttrs
   Caption         =   "frmAttrs"
   ClientHeight    =   1500
   ClientLeft      =   60
   ClientTop       =   450
   ClientWidth     =   2400
   LinkTopic       =   "Form1"
   ScaleHeight     =   1500
   ScaleWidth      =   2400
   StartUpPosition =   3  'Windows Default
End
Attribute VB_Name = "frmAttrs"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Option Explicit

Public Property Get Title() As String
Attribute Title.VB_Description = "The form's caption."
    Title = Me.Caption
End Property
