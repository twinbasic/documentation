Attribute VB_Name = "Module1"
Option Explicit

' The VB6 side of a bug reproducer: what VB6 does where the report says twinBASIC differs.
' Probe.vbp builds Probe.exe, whose Sub Main does nothing and writes nothing: the two builds
' of it are what is compared (node scripts/probe_build_twice.mjs --vb6).

Sub Main()
End Sub
