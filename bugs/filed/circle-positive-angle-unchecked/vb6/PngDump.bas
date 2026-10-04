Attribute VB_Name = "PngDump"
Option Explicit

' Saves what a surface or a window shows as a PNG file, for a bug report that is
' best shown by a picture. The same module, as PngDump.twin, runs in twinBASIC, so that
' the two pictures can be put side by side (node scripts/bug_repro.mjs run, then vb6).
'
'     PngDump.Surface Form1, "main"       ' an object with an hDC: a Form, PictureBox, UserControl
'     PngDump.Window Text1.hWnd, "text"   ' a control with no hDC; its client area
'
' The file is <folder>\<Name>.png. The folder is the BUGREPRO_IMAGES environment
' variable, which bug_repro.mjs sets, or else App.Path. Name uses letters, digits,
' - and _. Any failure raises error 5, whose Description says which call failed.
'
' The pixels are copied with BitBlt (or PrintWindow) into a bitmap of this module's own
' and saved with GDI+, so the picture is what was drawn, not what the object's Image
' property or SavePicture would make of it.
'
' The Declares are aliased to Png... names, so that a reproducer's own BitBlt or
' SelectObject cannot collide with them.

Private Type PngGuid
    Data1 As Long
    Data2 As Integer
    Data3 As Integer
    Data4(0 To 7) As Byte
End Type

Private Type PngGdipInput
    GdiplusVersion As Long
    DebugEventCallback As Long
    SuppressBackgroundThread As Long
    SuppressExternalCodecs As Long
End Type

Private Type PngRect
    Left As Long
    Top As Long
    Right As Long
    Bottom As Long
End Type

Private Type PngBmpHeader
    biSize As Long
    biWidth As Long
    biHeight As Long
    biPlanes As Integer
    biBitCount As Integer
    biCompression As Long
    biSizeImage As Long
    biXPelsPerMeter As Long
    biYPelsPerMeter As Long
    biClrUsed As Long
    biClrImportant As Long
End Type

Private Declare Function PngGdiplusStartup Lib "gdiplus" Alias "GdiplusStartup" ( _
    ByRef token As Long, ByRef startInput As PngGdipInput, ByVal startOutput As Long) As Long
Private Declare Sub PngGdiplusShutdown Lib "gdiplus" Alias "GdiplusShutdown" ( _
    ByVal token As Long)
Private Declare Function PngGdipCreateBitmapFromHBITMAP Lib "gdiplus" Alias "GdipCreateBitmapFromHBITMAP" ( _
    ByVal hbm As Long, ByVal hpal As Long, ByRef bitmap As Long) As Long
Private Declare Function PngGdipSaveImageToFile Lib "gdiplus" Alias "GdipSaveImageToFile" ( _
    ByVal image As Long, ByVal fileName As Long, ByRef clsidEncoder As PngGuid, ByVal encoderParams As Long) As Long
Private Declare Function PngGdipDisposeImage Lib "gdiplus" Alias "GdipDisposeImage" ( _
    ByVal image As Long) As Long
Private Declare Function PngCLSIDFromString Lib "ole32" Alias "CLSIDFromString" ( _
    ByVal lpsz As Long, ByRef pclsid As PngGuid) As Long
Private Declare Function PngCreateCompatibleDC Lib "gdi32" Alias "CreateCompatibleDC" ( _
    ByVal hdc As Long) As Long
Private Declare Function PngCreateDIBSection Lib "gdi32" Alias "CreateDIBSection" ( _
    ByVal hdc As Long, ByRef pbmi As PngBmpHeader, ByVal usage As Long, ByRef ppvBits As Long, _
    ByVal hSection As Long, ByVal offset As Long) As Long
Private Declare Function PngSelectObject Lib "gdi32" Alias "SelectObject" ( _
    ByVal hdc As Long, ByVal hObject As Long) As Long
Private Declare Function PngDeleteObject Lib "gdi32" Alias "DeleteObject" ( _
    ByVal hObject As Long) As Long
Private Declare Function PngDeleteDC Lib "gdi32" Alias "DeleteDC" ( _
    ByVal hdc As Long) As Long
Private Declare Function PngBitBlt Lib "gdi32" Alias "BitBlt" ( _
    ByVal hdcDest As Long, ByVal xDest As Long, ByVal yDest As Long, ByVal cx As Long, ByVal cy As Long, _
    ByVal hdcSrc As Long, ByVal xSrc As Long, ByVal ySrc As Long, ByVal rop As Long) As Long
Private Declare Function PngGetClientRect Lib "user32" Alias "GetClientRect" ( _
    ByVal hwnd As Long, ByRef rc As PngRect) As Long
Private Declare Function PngPrintWindow Lib "user32" Alias "PrintWindow" ( _
    ByVal hwnd As Long, ByVal hdcBlt As Long, ByVal flags As Long) As Long

' Saves the pixels an object with an hDC has drawn, <Name>.png.
Public Sub Surface(ByVal Obj As Object, ByVal Name As String)
    Dim target As String
    Dim w As Long
    Dim h As Long
    Dim src As Long
    target = TargetFile(Name)
    w = CLng(Obj.ScaleX(Obj.ScaleWidth, Obj.ScaleMode, vbPixels))
    h = CLng(Obj.ScaleY(Obj.ScaleHeight, Obj.ScaleMode, vbPixels))
    src = CLng(Obj.hDC)
    Capture 0, src, w, h, target
End Sub

' Saves the client area of a window, <Name>.png: for a control with no hDC.
Public Sub Window(ByVal hWnd As Long, ByVal Name As String)
    Dim target As String
    Dim rc As PngRect
    target = TargetFile(Name)
    If hWnd = 0 Then Err.Raise 5, "PngDump", "the window handle is 0"
    If PngGetClientRect(hWnd, rc) = 0 Then
        Err.Raise 5, "PngDump", "GetClientRect failed, error " & Err.LastDllError
    End If
    Capture hWnd, 0, rc.Right - rc.Left, rc.Bottom - rc.Top, target
End Sub

' The file's path, or error 5 for a name that is empty or uses a character outside
' letters, digits, - and _.
Private Function TargetFile(ByVal Name As String) As String
    Dim i As Long
    Dim c As Long
    Dim folder As String
    If Len(Name) = 0 Then Err.Raise 5, "PngDump", "the image name is empty"
    For i = 1 To Len(Name)
        c = AscW(Mid$(Name, i, 1))
        If Not ((c >= 48 And c <= 57) Or (c >= 65 And c <= 90) Or (c >= 97 And c <= 122) Or c = 45 Or c = 95) Then
            Err.Raise 5, "PngDump", "the image name """ & Name & """ must use only letters, digits, - and _"
        End If
    Next i
    folder = Environ$("BUGREPRO_IMAGES")
    If Len(folder) = 0 Then folder = App.Path
    If Right$(folder, 1) = "\" Then folder = Left$(folder, Len(folder) - 1)
    TargetFile = folder & "\" & Name & ".png"
End Function

' Copies w by h pixels, from the DC srcDC or, when hWnd is not 0, with PrintWindow, into a
' 24-bit bitmap of our own and saves it as target. Every GDI object and the GDI+ token
' are released on every path, and the error is raised after that.
Private Sub Capture(ByVal hWnd As Long, ByVal srcDC As Long, ByVal w As Long, ByVal h As Long, ByVal target As String)
    Dim token As Long
    Dim memDC As Long
    Dim dib As Long
    Dim oldBmp As Long
    Dim image As Long
    Dim bits As Long
    Dim hdr As PngBmpHeader
    Dim gdipIn As PngGdipInput
    Dim encoder As PngGuid
    Dim status As Long
    Dim failure As String

    If w < 1 Or h < 1 Then failure = "the surface is " & w & " by " & h & " pixels: nothing to capture": GoTo Done

    gdipIn.GdiplusVersion = 1
    status = PngGdiplusStartup(token, gdipIn, 0)
    If status <> 0 Then token = 0: failure = "GdiplusStartup failed, status " & status: GoTo Done

    status = PngCLSIDFromString(StrPtr("{557CF406-1A04-11D3-9A73-0000F81EF32E}"), encoder)
    If status <> 0 Then failure = "CLSIDFromString failed for the PNG encoder, HRESULT " & Hex$(status): GoTo Done

    memDC = PngCreateCompatibleDC(0)
    If memDC = 0 Then failure = "CreateCompatibleDC failed, error " & Err.LastDllError: GoTo Done

    hdr.biSize = 40
    hdr.biWidth = w
    hdr.biHeight = h
    hdr.biPlanes = 1
    hdr.biBitCount = 24
    dib = PngCreateDIBSection(memDC, hdr, 0, bits, 0, 0)
    If dib = 0 Then failure = "CreateDIBSection failed, error " & Err.LastDllError: GoTo Done

    oldBmp = PngSelectObject(memDC, dib)
    If oldBmp = 0 Then failure = "SelectObject failed, error " & Err.LastDllError: GoTo Done

    If hWnd = 0 Then
        If PngBitBlt(memDC, 0, 0, w, h, srcDC, 0, 0, &HCC0020) = 0 Then
            failure = "BitBlt failed, error " & Err.LastDllError: GoTo Done
        End If
    Else
        If PngPrintWindow(hWnd, memDC, 3) = 0 Then
            failure = "PrintWindow failed, error " & Err.LastDllError: GoTo Done
        End If
    End If

    ' GDI+ must not be given a bitmap that is selected into a device context.
    PngSelectObject memDC, oldBmp
    oldBmp = 0

    status = PngGdipCreateBitmapFromHBITMAP(dib, 0, image)
    If status <> 0 Then image = 0: failure = "GdipCreateBitmapFromHBITMAP failed, status " & status: GoTo Done

    status = PngGdipSaveImageToFile(image, StrPtr(target), encoder, 0)
    If status <> 0 Then failure = "GdipSaveImageToFile failed for " & target & ", status " & status

Done:
    If image <> 0 Then PngGdipDisposeImage image
    If memDC <> 0 Then
        If oldBmp <> 0 Then PngSelectObject memDC, oldBmp
        If dib <> 0 Then PngDeleteObject dib
        PngDeleteDC memDC
    End If
    If token <> 0 Then PngGdiplusShutdown token
    If Len(failure) > 0 Then Err.Raise 5, "PngDump", failure
End Sub
