---
title: GdiPlusUser
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/GdiPlusUser
has_toc: false
---

# GdiPlusUser class
{: .no_toc }

Starts GDI+ for the program. One instance must exist before any other class of the package is used.

GDI+ must be started before a program creates a pen, a bitmap or any other GDI+ object, and a **GdiPlusUser** does it. Without one, the other classes fail with status 18, *GdiplusNotInitialized*. **GdiPlusUser** inherits from [**GdiPlusBase**](GdiPlusBase), so it has the members of that class as well as the ones below.

Create the instance with the module function **GdiPlusUser**, keep it in a variable that lives as long as the program uses GDI+, and release it when the program is done.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Debug.Print user.LastResult                                      ' 0
Dim bmp As Bitmap = Bitmap(64!, 64!)
Debug.Print bmp.LastResult                                       ' 0
```

<!-- test: Gr_LibraryTests.GdiPlusUser_BitmapOfTwoWholeNumbers_IsCreated, Gr_LibraryTests.GdiPlusUser_BitmapOfSinglesOrWithFormat_IsCreated -->
> [!WARNING] 0.9.45.0
> Two whole numbers without a format do not create a bitmap of that size. `Bitmap(64, 64)` binds to the form that takes a GDI bitmap handle and a palette handle, treats 64 and 64 as handles, and returns an unusable object with **LastResult** 7 (**Win32Error**), without any error being raised. Pass **Single** values: `Bitmap(64!, 64!)`, or give a format, as in `Bitmap(64, 64, PixelFormat32bppARGB)`. [**Bitmap**](Bitmap#creating) has the details.

## Creating

Syntax: **GdiPlusUser**( [ *startupParams* ] ) \
Syntax: **GdiPlusUser**( *input* ) \
Syntax: **GdiPlusUser**( *input*, *output* ) \
Syntax: **New GdiPlusUser**( ... )

The module function **GdiPlusUser** and the `New` form take the same arguments.

*startupParams*
: *optional* A [**GdiplusStartupParams**](Enumerations/GdiplusStartupParams) value. The default is **GdiplusStartupDefault**. With this form the package asks for GDI+ version 2 and, when the system does not have it, version 1; the flags apply to version 2 only. If neither starts, **LastResult** of the new instance says why.

*input*
: *required* A [**GdiplusStartupInput**](Types/GdiplusStartupInput) that gives the version and the settings exactly. There is no fallback to version 1.

*output*
: *required* A [**GdiplusStartupOutput**](Types/GdiplusStartupOutput) that receives the hook and unhook functions of GDI+. Needed when *input* has **SuppressBackgroundThread** set.

<!-- test: Gr_LibraryTests.GdiPlusUser_InstanceWhileRunning_WithInvalidInput_ReportsFailure -->
> [!NOTE] 0.9.45.0
> Every instance calls GDI+ to start with its own arguments, not only the first. A later instance given an invalid *input* reports the failure in its **LastResult**, although GDI+ is already running.

<!-- test: Gr_LibraryTests.GdiPlusUser_ReleasingTheLastInstance_KeepsGdiPlusRunning -->
> [!NOTE] 0.9.45.0
> Releasing the last instance does not shut GDI+ down: objects that exist keep working, and new ones can still be made. GDI+ stays started until the program ends.

## Keeping the instance alive

Hold the instance in a variable that is created before any other GDI+ object and lives longer than all of them. In a form or a class, create it in the load handler or the constructor; in a program with a start-up procedure, create it there.

```tb check_build
Class Painter
    Private mGdiPlus As GdiPlusUser
    Private mBitmap As Bitmap

    Sub New()
        Set mGdiPlus = GdiPlusUser()
        Set mBitmap = Bitmap(100!, 100!)
    End Sub
End Class
```

Do not declare the variable with `New`, as in `Dim user As New GdiPlusUser`. Such a variable creates its object the first time it is used, and GDI+ objects created earlier fail with status 18:

```tb check_build
Dim lazy As New GdiPlusUser
Dim bmp As Bitmap = Bitmap(64!, 64!)     ' status 18: lazy has not been touched yet
Debug.Print lazy.LastResult              ' lazy is created only here
```

Code that handles the window messages itself creates the instance in response to `WM_CREATE` and releases it, with `Set user = Nothing`, in response to `WM_DESTROY`.

## Starting with other settings

To choose the version, to suppress the background thread or to pass the other startup settings, build a [**GdiplusStartupInput**](Types/GdiplusStartupInput) and pass it to the constructor of the first instance, at the start of the program.

```tb check_build
Dim settings As GdiplusStartupInput
settings.GdiplusVersion = 2
settings.StartupParameters = GdiplusStartupNoSetRound
Dim user As GdiPlusUser = GdiPlusUser(settings)
If user.LastResult <> Ok Then Debug.Print user.Status
```

## Methods

### GetBuildNumber

Syntax: *user*.**GetBuildNumber**( ) As **Long**

Returns the build number of the GDI+ library that is running. The value depends on the version of Windows. **LastResult** records a failure.

### TestControlForceBilinear, TestControlNoICM

Syntax: *user*.**TestControlForceBilinear**( *force* As **Boolean** ) As **GpStatus** \
Syntax: *user*.**TestControlNoICM**( *noICM* As **Boolean** ) As **GpStatus**

Meant to switch two debugging switches of GDI+: bilinear scaling forced for every scaled image, and the colour management turned off.

<!-- test: Gr_LibraryTests.TestControlForceBilinear_Method_ReturnsOk, Gr_LibraryTests.TestControlNoICM_Method_ReturnsOk, Gr_LibraryTests.TestControl_ModuleFunctions_ReturnOk -->
> [!WARNING] 0.9.45.0
> Both methods call themselves without end. Calling either on a **GdiPlusUser** ends the program with a stack overflow. Call the module functions of the same names, [**TestControlForceBilinear**](Helpers#testcontrolforcebilinear) and [**TestControlNoICM**](Helpers#testcontrolnoicm), which do what the methods were written to do.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Debug.Print user.GetBuildNumber() > 0                            ' True
Debug.Print TestControlNoICM(False)                              ' 0
```

## See Also

- [GdiPlusBase](GdiPlusBase) class -- the members of every class: **LastResult**, **Status** and the error handling
- [GdiplusStartupInput](Types/GdiplusStartupInput) type -- the startup settings
- [GdiplusStartupOutput](Types/GdiplusStartupOutput) type -- the hook and unhook functions
- [GdiplusStartupParams](Enumerations/GdiplusStartupParams) enumeration -- the startup flags
- [Helpers](Helpers) -- the module functions of the package
- [GdiplusStartup](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusinit/nf-gdiplusinit-gdiplusstartup) -- the GDI+ function on Microsoft Learn
