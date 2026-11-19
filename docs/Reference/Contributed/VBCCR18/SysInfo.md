---
title: SysInfo
parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/SysInfo
has_toc: false
symbols:
  - SysInfo
  - SysACStatusConstants
  - SysBatteryStatusConstants
  - SysDeviceTypeConstants
---

# SysInfo class
{: .no_toc }

A **SysInfo** is a control that shows nothing at run time: it raises events when the settings, the devices or the power of the system change, and its properties report the power status, the desktop's work area and the width of a scroll bar.

```tb check_build check_run arch=win32,win64
Debug.Print TypeName(SysInfo1.WorkAreaWidth)
Debug.Print SysInfo1.WorkAreaWidth > 0
Debug.Print SysInfo1.WorkAreaLeft >= 0, SysInfo1.WorkAreaTop >= 0
' Output:
' Single
' True
' True          True
```

```tb hidden
Public Declare PtrSafe Function SysInfoSendMessage Lib "user32" Alias "SendMessageW" (ByVal hWnd As LongPtr, ByVal wMsg As Long, ByVal wParam As LongPtr, ByVal lParam As LongPtr) As LongPtr
Public Const WM_TIMECHANGE As Long = &H1E
Public Const WM_SETTINGCHANGE As Long = &H1A
Public DriveEInUse As Boolean
```

```tb hidden
Class SettingsWatcher
    Public WithEvents Info As VBCCR18.SysInfo
    Private Sub Info_TimeChanged() Handles Info.TimeChanged
        Debug.Print "TimeChanged"
    End Sub
    Private Sub Info_SettingChanged(ByVal Item As Long, ByVal Section As String) Handles Info.SettingChanged
        Debug.Print "SettingChanged " & Item & " " & Section
    End Sub
End Class
```

```tb hidden
Class SystemWatcher
    Public WithEvents Info As VBCCR18.SysInfo
    Public Refuse As Boolean
    Private Sub Info_DisplayChanged(ByVal NewColorDepth As Long, ByVal NewWidth As Single, ByVal NewHeight As Single) Handles Info.DisplayChanged
        Debug.Print "DisplayChanged " & NewColorDepth & " " & (NewWidth = 800 * Screen.TwipsPerPixelX) & " " & (NewHeight = 600 * Screen.TwipsPerPixelY)
    End Sub
    Private Sub Info_PowerQuerySuspend(Cancel As Boolean) Handles Info.PowerQuerySuspend
        Debug.Print "PowerQuerySuspend"
        Cancel = Refuse
    End Sub
    Private Sub Info_DeviceArrival(ByVal DeviceType As SysDeviceTypeConstants, ByVal DeviceID As Long, ByVal DeviceName As String, ByVal DeviceData As Long) Handles Info.DeviceArrival
        Debug.Print "DeviceArrival " & DeviceType & " " & DeviceID & " " & DeviceName & " " & DeviceData
    End Sub
    Private Sub Info_DeviceQueryRemove(ByVal DeviceType As SysDeviceTypeConstants, ByVal DeviceID As Long, ByVal DeviceName As String, ByVal DeviceData As Long, Cancel As Boolean) Handles Info.DeviceQueryRemove
        Debug.Print "DeviceQueryRemove " & DeviceName
        Cancel = Refuse
    End Sub
End Class
```

The control stands in place of the SysInfo control of `SYSINFO.OCX`, and adds the [**ThemeChanged**](#themechanged) event and the [**hMain**](#hmain) property.

Of the [common members](Common), the control has [**Name**](Common#name), [**Parent**](Common#parent) and [**Tag**](Common#tag) alone.

* TOC
{:toc}

## How the events arrive

Windows tells each top-level window of a program when a setting of the system changes, by a window message: `WM_SETTINGCHANGE` for a setting, `WM_TIMECHANGE` for the clock, `WM_DEVICECHANGE` for a device, `WM_POWERBROADCAST` for the power. The control watches the messages of the top-level window that its form belongs to, [**hMain**](#hmain), and raises an event for each. It also asks Windows for the arrival and removal of every kind of device interface, and raises [**DeviceArrival**](#devicearrival-deviceremovecomplete) and the other device events for those too.

A program that wants to see its handler work can send such a message to **hMain** itself, which changes nothing on the system:

<!-- test: SysInfoTests.TimeChanged_RaisedByWmTimeChange, SysInfoTests.SettingChanged_GivesTheItemAndTheSection -->
```tb check_build check_run arch=win32,win64
Dim Watch As New SettingsWatcher
Set Watch.Info = SysInfo1
SysInfoSendMessage SysInfo1.hMain, WM_TIMECHANGE, 0, 0
Dim Section As String = "intl"
SysInfoSendMessage SysInfo1.hMain, WM_SETTINGCHANGE, 0, StrPtr(Section)
' Output:
' TimeChanged
' SettingChanged 0 intl
```
<!-- /test -->

**SettingsWatcher** in this sample is a class of the program's own that holds the control **WithEvents** and prints its events.

## Refusing a request

<!-- test: sample sysinfo-refuse -->
[**DeviceQueryRemove**](#devicequeryremove), [**QueryChangeConfig**](#querychangeconfig) and [**PowerQuerySuspend**](#powerquerysuspend) are raised when Windows asks whether the program agrees to a change. A handler that sets *Cancel* to **True** refuses it: the control answers Windows with `BROADCAST_QUERY_DENY`. Windows 10 sends no request before the system sleeps, so **PowerQuerySuspend** and [**PowerQuerySuspendFailed**](#powerquerysuspendfailed) are not raised there; [**PowerSuspend**](#powersuspend) and [**PowerResume**](#powerresume) are.

```tb probe check_run arch=win32,win64 id=sysinfo-refuse
Dim Watch As New SystemWatcher
Set Watch.Info = SysInfo1
Watch.Refuse = True
Debug.Print Hex$(SysInfoSendMessage(SysInfo1.hMain, &H218, 0, 0))
Dim Volume(0 To 4) As Long
Volume(0) = 20: Volume(1) = 2: Volume(3) = 8: Volume(4) = 1
Debug.Print Hex$(SysInfoSendMessage(SysInfo1.hMain, &H219, &H8001&, VarPtr(Volume(0))))
' Output:
' PowerQuerySuspend
' 424D5144
' DeviceQueryRemove D
' 424D5144
```
<!-- /test -->

```tb check_build
Private Sub SysInfo1_DeviceQueryRemove(ByVal DeviceType As SysDeviceTypeConstants, ByVal DeviceID As Long, ByVal DeviceName As String, ByVal DeviceData As Long, Cancel As Boolean)
    ' Keep drive E: while the program still writes to it.
    If DeviceType = SysDeviceTypeVolume And DeviceName = "E" Then Cancel = DriveEInUse
End Sub
```

Properties
----------

<!-- test: SysInfoTests.ACStatus_Assigned_Raises383 -->
Every property of the control is read-only: assigning one raises run-time error 383.
<!-- /test -->

### ACStatus
{: .no_toc }

Whether the computer runs on mains power. A member of [**SysACStatusConstants**](#sysacstatusconstants).

### BatteryFullTime
{: .no_toc }

How long a full battery lasts, in seconds. **Long**. It is -1 when Windows does not know, and while the computer is on mains power.

### BatteryLifePercent
{: .no_toc }

The charge left in the battery, as a percentage from 0 to 100. **Integer**. It is 255 when Windows does not know.

### BatteryLifeTime
{: .no_toc }

How long the charge left in the battery lasts, in seconds. **Long**. It is -1 when Windows does not know, and while the computer is on mains power.

### BatteryStatus
{: .no_toc }

The state of the battery's charge: the sum of the members of [**SysBatteryStatusConstants**](#sysbatterystatusconstants) that apply, such as **SysBatteryStatusHigh** and **SysBatteryStatusCharging**. It is 0 for a battery between low and high that is not charging.

### hMain
{: .no_toc }

The handle of the window whose messages the control watches: the top-level window at the end of the chain of parents and owners of the control's own window. **LongPtr**.

### ScrollBarSize
{: .no_toc }

The width of a vertical scroll bar, in twips. **Single**.

### WorkAreaHeight, WorkAreaLeft, WorkAreaTop, WorkAreaWidth
{: .no_toc }

The size and the position of the work area of the primary monitor, the part of its desktop that the taskbar does not cover, in twips. **Single**.

Events
------

### ConfigChangeCancelled, ConfigChanged
{: .no_toc }

Raised when a change of the hardware profile, such as docking or undocking a laptop, has been cancelled and when it has been made.

Syntax: *object*\_**ConfigChanged**( )

### DeviceArrival, DeviceRemoveComplete
{: .no_toc }

Raised when a device or a medium has been added to the system, such as a USB drive plugged in or a disc put in a drive, and when one has been removed.

Syntax: *object*\_**DeviceArrival**( **ByVal** *DeviceType* **As SysDeviceTypeConstants**, **ByVal** *DeviceID* **As Long**, **ByVal** *DeviceName* **As String**, **ByVal** *DeviceData* **As Long** )

*DeviceType*
: The kind of device, a member of [**SysDeviceTypeConstants**](#sysdevicetypeconstants). The arguments that follow depend on it, as the table there says.

*DeviceID*, *DeviceName*, *DeviceData*
: What identifies the device: for a volume, the drives as a mask with one bit for each letter, the first letter, and 1 for a medium or 2 for a network drive.

<!-- test: sample sysinfo-volume -->
A volume's *DeviceID* has bit 0 for drive A, bit 3 for drive D and so on, and *DeviceName* is the letter of its lowest bit.

```tb probe check_run arch=win32,win64 id=sysinfo-volume
Dim Watch As New SystemWatcher
Set Watch.Info = SysInfo1
Dim Volume(0 To 4) As Long
Volume(0) = 20: Volume(1) = 2: Volume(3) = 8: Volume(4) = 1
SysInfoSendMessage SysInfo1.hMain, &H219, &H8000&, VarPtr(Volume(0))
' Output:
' DeviceArrival 2 8 D 1
```
<!-- /test -->

### DeviceQueryRemove
{: .no_toc }

Raised when Windows asks whether a device may be removed. See [Refusing a request](#refusing-a-request).

Syntax: *object*\_**DeviceQueryRemove**( **ByVal** *DeviceType* **As SysDeviceTypeConstants**, **ByVal** *DeviceID* **As Long**, **ByVal** *DeviceName* **As String**, **ByVal** *DeviceData* **As Long**, *Cancel* **As Boolean** )

*DeviceType*, *DeviceID*, *DeviceName*, *DeviceData*
: As in [**DeviceArrival**](#devicearrival-deviceremovecomplete).

*Cancel*
: **False** when the event is raised. A handler that sets it to **True** refuses the removal.

### DeviceQueryRemoveFailed, DeviceRemovePending
{: .no_toc }

Raised when the removal of a device has been refused, by this program or another, and when the device is about to be removed, after every program has agreed.

Syntax: *object*\_**DeviceRemovePending**( **ByVal** *DeviceType* **As SysDeviceTypeConstants**, **ByVal** *DeviceID* **As Long**, **ByVal** *DeviceName* **As String**, **ByVal** *DeviceData* **As Long** )

The arguments are as in [**DeviceArrival**](#devicearrival-deviceremovecomplete).

### DevModeChanged
{: .no_toc }

Raised when the settings of a printer have changed.

Syntax: *object*\_**DevModeChanged**( )

### DevNodesChanged
{: .no_toc }

Raised when a device has been added to the system or removed from it. A program that keeps a list of devices reads it again.

Syntax: *object*\_**DevNodesChanged**( )

### DisplayChanged
{: .no_toc }

Raised when the resolution or the color depth of the screen has changed.

Syntax: *object*\_**DisplayChanged**( **ByVal** *NewColorDepth* **As Long**, **ByVal** *NewWidth* **As Single**, **ByVal** *NewHeight* **As Single** )

*NewColorDepth*
: The bits for each pixel.

*NewWidth*, *NewHeight*
: The size of the screen, in twips.

<!-- test: sample sysinfo-display -->
The size is the screen's size in pixels times [**Screen.TwipsPerPixelX**](../../VB/Screen/#twipsperpixelx) and **TwipsPerPixelY**.

```tb probe check_run arch=win32,win64 id=sysinfo-display
Dim Watch As New SystemWatcher
Set Watch.Info = SysInfo1
SysInfoSendMessage SysInfo1.hMain, &H7E, 32, (600 * &H10000) Or 800
' Output:
' DisplayChanged 32 True True
```
<!-- /test -->

### FontChanged
{: .no_toc }

Raised when a font has been installed or removed.

Syntax: *object*\_**FontChanged**( )

### PowerQuerySuspend
{: .no_toc }

Raised when Windows asks whether the system may sleep. See [Refusing a request](#refusing-a-request).

Syntax: *object*\_**PowerQuerySuspend**( *Cancel* **As Boolean** )

*Cancel*
: **False** when the event is raised. A handler that sets it to **True** refuses the request.

### PowerQuerySuspendFailed
{: .no_toc }

Raised when the system was to sleep and a program refused it.

Syntax: *object*\_**PowerQuerySuspendFailed**( )

### PowerResume
{: .no_toc }

Raised when the system has woken from sleep.

Syntax: *object*\_**PowerResume**( )

### PowerStatusChanged
{: .no_toc }

Raised when the power status has changed: the computer has been plugged in or unplugged, or the battery's charge has changed. The properties then report the new status.

Syntax: *object*\_**PowerStatusChanged**( )

### PowerSuspend
{: .no_toc }

Raised just before the system sleeps.

Syntax: *object*\_**PowerSuspend**( )

### QueryChangeConfig
{: .no_toc }

Raised when Windows asks whether the hardware profile may change. See [Refusing a request](#refusing-a-request).

Syntax: *object*\_**QueryChangeConfig**( *Cancel* **As Boolean** )

### SettingChanged
{: .no_toc }

Raised when a setting of the system has changed, by the user in the Settings app or by a program.

Syntax: *object*\_**SettingChanged**( **ByVal** *Item* **As Long**, **ByVal** *Section* **As String** )

*Item*
: The number of the setting, as the Windows function `SystemParametersInfo` names it, such as 47 (`SPI_SETWORKAREA`) when the work area has changed. It is 0 for a change that is not one of those.

*Section*
: The name of the part of the settings that changed, such as `intl` for the regional settings or `Environment` for the environment variables, or empty.

### SysColorsChanged
{: .no_toc }

Raised when a system color has changed.

Syntax: *object*\_**SysColorsChanged**( )

### ThemeChanged
{: .no_toc }

Raised when a visual style of Windows has been turned on or off, or another one chosen.

Syntax: *object*\_**ThemeChanged**( )

### TimeChanged
{: .no_toc }

Raised when the system time has been changed.

Syntax: *object*\_**TimeChanged**( )

## SysACStatusConstants
{: #sysacstatusconstants }

The values of [**ACStatus**](#acstatus).

| Member | Value | Description |
|---|---|---|
| **SysACStatusOffline**{: #SysACStatusConstants_SysACStatusOffline } | 0 | The computer runs on its battery. |
| **SysACStatusOnline**{: #SysACStatusConstants_SysACStatusOnline } | 1 | The computer runs on mains power. |
| **SysACStatusUnknown**{: #SysACStatusConstants_SysACStatusUnknown } | 255 | Windows does not know. |

## SysBatteryStatusConstants
{: #sysbatterystatusconstants }

The flags of [**BatteryStatus**](#batterystatus).

| Member | Value | Description |
|---|---|---|
| **SysBatteryStatusHigh**{: #SysBatteryStatusConstants_SysBatteryStatusHigh } | 1 | More than 66 per cent of the charge is left. |
| **SysBatteryStatusLow**{: #SysBatteryStatusConstants_SysBatteryStatusLow } | 2 | Less than 33 per cent is left. |
| **SysBatteryStatusCritical**{: #SysBatteryStatusConstants_SysBatteryStatusCritical } | 4 | Less than 5 per cent is left. |
| **SysBatteryStatusCharging**{: #SysBatteryStatusConstants_SysBatteryStatusCharging } | 8 | The battery is charging. |
| **SysBatteryStatusNone**{: #SysBatteryStatusConstants_SysBatteryStatusNone } | 128 | The computer has no battery. |
| **SysBatteryStatusUnknown**{: #SysBatteryStatusConstants_SysBatteryStatusUnknown } | 255 | Windows does not know. |

## SysDeviceTypeConstants
{: #sysdevicetypeconstants }

The values of the *DeviceType* argument of the device events, and what the other arguments then hold.

| Member | Value | Device | *DeviceID* | *DeviceName* | *DeviceData* |
|---|---|---|---|---|---|
| **SysDeviceTypeOEM**{: #SysDeviceTypeConstants_SysDeviceTypeOEM } | 0 | A device of the computer's maker | its identifier | empty | its function |
| **SysDeviceTypeDevNode**{: #SysDeviceTypeConstants_SysDeviceTypeDevNode } | 1 | A node of the device tree | the node | empty | 0 |
| **SysDeviceTypeVolume**{: #SysDeviceTypeConstants_SysDeviceTypeVolume } | 2 | A drive | the drives, one bit for each letter | the first letter | 1 for a medium, 2 for a network drive |
| **SysDeviceTypePort**{: #SysDeviceTypeConstants_SysDeviceTypePort } | 3 | A serial or parallel port | 0 | its name, such as `COM3` | 0 |
| **SysDeviceTypeDevInterface**{: #SysDeviceTypeConstants_SysDeviceTypeDevInterface } | 5 | A device interface | 0 | the interface's path | 0 |

## See Also

- [Common members](Common) -- the three common members this control has
- [Screen](../../VB/Screen/) object -- the size of the whole screen, and the twips in a pixel
