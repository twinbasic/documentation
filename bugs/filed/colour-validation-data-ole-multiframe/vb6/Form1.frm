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
   Visible         =   0   'False
   Begin VB.OLE OLE1
      Height          =   315
      Left            =   1200
      TabIndex        =   8
      Top             =   2280
      Width           =   855
   End
   Begin Probe.UC1 UC1
      Height          =   1215
      Left            =   3360
      TabIndex        =   7
      Top             =   120
      Width           =   1215
   End
   Begin VB.CommandButton CommandButton1
      Height          =   255
      Left            =   240
      TabIndex        =   3
      Top             =   1800
      Width           =   855
   End
   Begin VB.TextBox TextBox1
      Height          =   255
      Left            =   240
      TabIndex        =   2
      Top             =   1320
      Width           =   855
   End
   Begin VB.Label Label1
      Height          =   255
      Left            =   240
      Top             =   840
      Width           =   855
   End
   Begin VB.PictureBox PictureBox1
      Height          =   255
      Left            =   240
      ScaleHeight     =   195
      ScaleWidth      =   795
      TabIndex        =   0
      Top             =   360
      Width           =   855
   End
End
Attribute VB_Name = "Form1"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Option Explicit
