---
title: GdiPlusBase
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/GdiPlusBase
has_toc: false
---

# GdiPlusBase class
{: .no_toc }

The base class of the classes of the package. It keeps the result of the last GDI+ call and carries out the error handling.

A program does not create a **GdiPlusBase**. Every other class of the package inherits from it: [**GdiPlusUser**](GdiPlusUser), [**Graphics**](Graphics), [**Pen**](Pen), [**Bitmap**](Bitmap) and the rest, so the members below are members of all of them. A variable of the type **GdiPlusBase** holds any one of them.

Almost every method and constructor of the package calls GDI+, and GDI+ reports a failure as a status code. A method that returns no value returns that status as a [**GpStatus**](Enumerations/GpStatus); the other methods return their value and leave the status in **LastResult**. When a constructor fails, it creates an object that cannot be used, and its **LastResult** says why.

## Creating

A **GdiPlusBase** cannot be created. Create one of the classes that inherit from it, such as [**GdiPlusUser**](GdiPlusUser#creating), [**Graphics**](Graphics#creating) or [**Pen**](Pen#creating).

## Last result

<!-- test: Gr_BaseTests.LastResult_AfterAFailedCall_IsTheStatus, Gr_BaseTests.LastResult_ASuccessfulCall_DoesNotClearIt, Gr_BaseTests.GetLastResult_ReturnsTheStatusAndClearsIt -->
### LastResult

Syntax: *object*.**LastResult** As **GpStatus**

Read-only. Returns the status of the most recent call on the object that failed. **Ok**, the value 0, means that none has failed.

A successful call does not set **LastResult** back to **Ok**. Clear it with **ClearResult** or **GetLastResult** before a call whose result you want to look at.

### Status, StatusNL

Syntax: *object*.**Status** As **String** \
Syntax: *object*.**StatusNL** As **String**

Read-only. Return the text of **LastResult**, such as `Ok`, `Invalid Parameter` or `Out of Memory`. **StatusNL** ends the text with a carriage return and a line feed. The text of any status is also returned by [**AsText**](Helpers#astext).

### ClearResult, GetLastResult

Syntax: *object*.**ClearResult**( ) As **GpStatus** \
Syntax: *object*.**GetLastResult**( ) As **GpStatus**

Both set **LastResult** back to **Ok** and return the value it had. They are the same function.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim bmp As Bitmap = Bitmap(8!, 8!)
Debug.Print bmp.LastResult                                       ' 0
Debug.Print bmp.Status                                           ' Ok
Dim c As Color = bmp.Pixel(100, 100)       ' outside the bitmap
Debug.Print bmp.LastResult                                       ' 2
Debug.Print bmp.Status                                           ' Invalid Parameter
c = bmp.Pixel(1, 1)
Debug.Print bmp.LastResult                                       ' 2 -- a good call does not clear it
Debug.Print bmp.GetLastResult()                                  ' 2
Debug.Print bmp.LastResult                                       ' 0
```
<!-- /test -->

## Memory

### Alloc, Free

Syntax: *class*.**Alloc**( *size* As **LongPtr** ) As **LongPtr** \
Syntax: *class*.**Free**( *pointer* As **LongPtr** )

Static members. **Alloc** reserves a block of *size* bytes with the allocator of GDI+ and returns its address, or 0. **Free** releases a block that **Alloc** returned. They are for the buffers that GDI+ itself hands over to or takes from a program.

<!-- test: compile GrBaseAllocIsNotRecognised, compile GrUserAllocCompiles, Gr_LibraryTests.Alloc_ThroughAClass_ReturnsABlock -->
> [!NOTE] 0.9.45.0
> Call them through a class that inherits from **GdiPlusBase**, as in `GdiPlusUser.Alloc(64)`. The name `GdiPlusBase.Alloc` is not recognised.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim block As LongPtr = GdiPlusUser.Alloc(64)
Debug.Print block <> 0                                           ' True
GdiPlusUser.Free block
```

## Error handling

<!-- test: Gr_BaseTests.GdipErrorHandlingStrategy_Default_IgnoresErrors, Gr_BaseTests.RaiseErrors_AFailedCall_RaisesTheStatusPlusTheBase, Gr_BaseTests.RaiseErrors_ACodeBase_IsAddedToTheStatus, Gr_BaseTests.HandleErrors_AFailedCall_CallsTheHandler -->
By default a failure is only recorded in **LastResult**. Three variables of the package, shared by all objects, choose another behaviour.

### GdipErrorHandlingStrategy

Syntax: **GdipErrorHandlingStrategy** [ = *strategy* ] As [**GpErrorHandlingStrategy**](Enumerations/GpErrorHandlingStrategy)

What happens, after the status has been recorded, when a call fails:

| Strategy | Behaviour |
|---|---|
| **IgnoreErrors** | Nothing more. This is the default. |
| **RaiseErrors** | A run-time error is raised with the number **GdipErrorCodeBase** plus the status, the source `GdiPlus:` followed by the type name of the object (such as `GdiPlus:Bitmap`) and the status number as its description. |
| **HandleErrors** | The function in **GdipErrorHandler** is called, when it is set. |
| **StopOnErrors** | A `Stop` statement runs, which acts as a breakpoint in the debugger. |

### GdipErrorCodeBase

Syntax: **GdipErrorCodeBase** [ = *value* ] As **Long**

The number that is added to the status to make the error number under **RaiseErrors**. The default is 3300, so a status 2 is error 3302.

### GdipErrorHandler

Syntax: **GdipErrorHandler** [ = *function* ] As **GdipErrorHandler**

Under **HandleErrors**, the function that is called with the object that failed. Its **LastResult** has been set to the status. The delegate type has the signature **Function**( *obj* As **GdiPlusBase** ). The variable is 0 until a function is assigned.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim bmp As Bitmap = Bitmap(8!, 8!)
GdipErrorHandlingStrategy = RaiseErrors
On Error Resume Next
Dim c As Color = bmp.Pixel(100, 100)       ' outside the bitmap
Debug.Print Err.Number                                           ' 3302
Debug.Print Err.Source                                           ' GdiPlus:Bitmap
Debug.Print Err.Description                                      ' 2
GdipErrorHandlingStrategy = IgnoreErrors
```

A handler is a function in a module, assigned with **CType** and **AddressOf**.

```tb check_build projname=gdiplusbase-handler
Public LastFailure As String

Function OnGdiPlusError(ByVal obj As GdiPlusBase) As Variant
    LastFailure = TypeName(obj) & " " & obj.LastResult
End Function
```

```tb check_build check_run projname=gdiplusbase-handler
Dim user As GdiPlusUser = GdiPlusUser()
Dim bmp As Bitmap = Bitmap(8!, 8!)
GdipErrorHandlingStrategy = HandleErrors
GdipErrorHandler = CType(Of GdipErrorHandler)(AddressOf OnGdiPlusError)
Dim c As Color = bmp.Pixel(100, 100)       ' outside the bitmap
Debug.Print LastFailure                                          ' Bitmap 2
GdipErrorHandlingStrategy = IgnoreErrors
```
<!-- /test -->

## Protected members

### SetStatus

Syntax: **SetStatus**( *status* As **GpStatus** ) As **GpStatus**

For the classes of the package. Called by essentially every method after a GDI+ call, it does nothing when *status* is **Ok**. Otherwise it records the status in **LastResult**, applies the error-handling strategy, and returns the status.

## See Also

- [GdiPlusUser](GdiPlusUser) class -- starts GDI+; the first object every program creates
- [GpStatus](Enumerations/GpStatus) enumeration -- the status codes
- [GpErrorHandlingStrategy](Enumerations/GpErrorHandlingStrategy) enumeration -- the strategies
- [Helpers](Helpers) -- **AsText** and the other module functions
