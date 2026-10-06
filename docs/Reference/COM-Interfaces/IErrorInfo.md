---
title: IErrorInfo
parent: COM Interfaces
permalink: /Reference/COM-Interfaces/IErrorInfo
---

# IErrorInfo interface
{: .no_toc }

Describes an error that a COM method has reported: the source that raised it, a text description and a Help topic. It is the object a failing method leaves on the calling thread, together with the **ISupportErrorInfo** interface that says whether an object does so, and the **ICreateErrorInfo** interface that fills one in.

* TOC
{:toc}

## How COM passes error information

A COM method returns an **HRESULT**, a 32-bit code that says only whether the call succeeded and, if not, roughly why. A description, a source and a Help topic do not fit in it. COM passes them separately, in a slot that holds one **IErrorInfo** object for each thread.

The method that fails and the code that calls it follow a fixed order:

1. The method creates an error object with **CreateErrorInfo**, which returns its **ICreateErrorInfo** interface.
2. It fills the object in with **SetGUID**, **SetSource**, **SetDescription**, **SetHelpFile** and **SetHelpContext**.
3. It stores the object in the thread's slot with **SetErrorInfo**, replacing what the slot held, and returns a failure **HRESULT**.
4. The caller sees the failure code. Before it trusts the slot, it checks that the object sets error information: it queries the object for **ISupportErrorInfo** and calls **InterfaceSupportsErrorInfo** with the identifier of the interface it called through. The check matters because the slot belongs to the thread, not to the object. Another object, called earlier on the same thread, may have left its contents behind, and a method that never set error information leaves them as they were.
5. When the answer is `S_OK`, the caller calls **GetErrorInfo**. It returns the object, **and empties the slot**, so a second call returns nothing. The caller reads the five properties and releases the object.

**GetErrorInfo** returns `S_FALSE`, and no object, when the slot is empty. Its first argument is reserved and must be 0.

## Declaration

**IErrorInfo** derives from **IUnknown** and has the interface identifier `1CF2B120-547D-101B-8E65-08002B2BD119`. **ISupportErrorInfo** has `DF0B3D60-548F-101B-8E65-08002B2BD119` and **ICreateErrorInfo** has `22F03340-547D-101B-8E65-08002B2BD119`.

The **stdole** type library declares none of the three, so a project declares its own, as it does for [**IEnumVARIANT**](IEnumVARIANT). It also needs a type for an interface identifier. The **GUID** type in **stdole** cannot be used: the compiler refuses to create a variable of it (error TB5106, `cannot create an instance of this datatype as it contains an unsupported member`). A project declares a structure of the same layout instead.

The methods return an **HRESULT**, which twinBASIC hides as it does for any interface method: a failure code raises a run-time error, and a method whose last value is returned through a pointer is declared as a **Function**. The strings are **BSTR** values that the caller owns, and twinBASIC frees them.

```tb check_build projname=com-ierrorinfo slot=file
Module GuidTypes
    Public Type TbGuid
        Data1 As Long
        Data2 As Integer
        Data3 As Integer
        Data4(0 To 7) As Byte
    End Type
End Module

[InterfaceId("1CF2B120-547D-101B-8E65-08002B2BD119")]
Private Interface IErrorInfo Extends stdole.IUnknown
    Sub GetGUID(ByRef pGUID As TbGuid)
    Function GetSource() As String
    Function GetDescription() As String
    Function GetHelpFile() As String
    Function GetHelpContext() As Long
End Interface

[InterfaceId("DF0B3D60-548F-101B-8E65-08002B2BD119")]
Private Interface ISupportErrorInfo Extends stdole.IUnknown
    Sub InterfaceSupportsErrorInfo(ByRef riid As TbGuid)
End Interface

[InterfaceId("22F03340-547D-101B-8E65-08002B2BD119")]
Private Interface ICreateErrorInfo Extends stdole.IUnknown
    Sub SetGUID(ByRef rguid As TbGuid)
    Sub SetSource(ByVal szSource As LongPtr)
    Sub SetDescription(ByVal szDescription As LongPtr)
    Sub SetHelpFile(ByVal szHelpFile As LongPtr)
    Sub SetHelpContext(ByVal dwHelpContext As Long)
End Interface

Private Module ErrorInfoApi
    Public Declare PtrSafe Function GetErrorInfo Lib "oleaut32" ( _
        ByVal dwReserved As Long, ByRef pperrinfo As IErrorInfo) As Long
    Public Declare PtrSafe Function SetErrorInfo Lib "oleaut32" ( _
        ByVal dwReserved As Long, ByVal perrinfo As IErrorInfo) As Long
    Public Declare PtrSafe Function CreateErrorInfo Lib "oleaut32" ( _
        ByRef pperrinfo As ICreateErrorInfo) As Long
    Public Declare PtrSafe Function IIDFromString Lib "ole32" ( _
        ByVal lpsz As LongPtr, ByRef lpiid As TbGuid) As Long
    Public Declare PtrSafe Function IsEqualGUID Lib "ole32" ( _
        ByRef rguid1 As TbGuid, ByRef rguid2 As TbGuid) As Long
End Module
```

The **ICreateErrorInfo** strings are passed as addresses of null-terminated Unicode text, which [**StrPtr**](../../tB/Modules/Information/StrPtr) supplies. The functions come from oleaut32.dll, and **IIDFromString** and **IsEqualGUID** from ole32.dll; they are described [below](#icreateerrorinfo-and-the-oleaut32-functions).

## IErrorInfo methods

### GetGUID
{: .no_toc }

Returns the identifier of the interface that defined the error.

Syntax: *object*.**GetGUID** *pGUID*

*pGUID*
: *required* A **TbGuid** (the structure declared above) that receives the identifier. For an error raised through a dispatch interface, it is the identifier of **IDispatch**.

### GetSource
{: .no_toc }

Returns the name of the class or application that raised the error.

Syntax: *object*.**GetSource**()

Returns a **String**. By convention it has the form *project*.*class*, or the programmatic identifier of the component, as in `WshShell.RegRead`.

### GetDescription
{: .no_toc }

Returns the text that describes the error.

Syntax: *object*.**GetDescription**()

Returns a **String**, written for the person using the program.

### GetHelpFile
{: .no_toc }

Returns the path of the Help file that describes the error.

Syntax: *object*.**GetHelpFile**()

Returns a **String**. It is empty when the error has no Help topic.

### GetHelpContext
{: .no_toc }

Returns the number of the topic in the Help file.

Syntax: *object*.**GetHelpContext**()

Returns a **Long**, 0 when the error has no Help topic. The number identifies a topic in the file that **GetHelpFile** names.

## ISupportErrorInfo

**ISupportErrorInfo** has one method. An object implements it to promise that the methods of the interfaces it names fill the thread's slot before they return a failure code.

### InterfaceSupportsErrorInfo
{: .no_toc }

Says whether an interface of the object sets error information.

Syntax: *object*.**InterfaceSupportsErrorInfo** *riid*

*riid*
: *required* A **TbGuid** holding the interface identifier the caller asks about.

Returns `S_OK` when the methods of that interface set error information, and `S_FALSE` when they do not. The method is declared as a **Sub**, so a caller does not get the code as a value. `S_FALSE` raises no error, and [**Err.LastHresult**](../../tB/Modules/ErrObject/LastHresult) holds it until the next call. Read it in the statement straight after the method.

### Where twinBASIC answers it

**Every twinBASIC class answers a query for ISupportErrorInfo**, and the answer to **InterfaceSupportsErrorInfo** is `S_OK` whatever *riid* holds: an interface the class implements, one it does not, and the all-zero identifier. The same holds for a **Collection**. A caller therefore always goes on to read the slot of a twinBASIC object.

A class that implements **ISupportErrorInfo** itself, with [**Implements**](../../tB/Core/Implements), answers with its own method instead. It returns `S_FALSE` by setting [**Err.ReturnHResult**](../../tB/Modules/ErrObject/ReturnHResult) to 1. [The example](#a-class-that-answers-for-itself) at the end of the page does this.

System components differ from one another, because each implements what it chooses. On Windows 10, **Scripting.FileSystemObject**, **Scripting.Dictionary**, **WScript.Shell** and **Shell.Application** refuse the query, while **ADODB.Connection** and **MSXML2.DOMDocument.6.0** accept it. twinBASIC does not need the answer when a call fails: it reads the error information of a failed call into **Err** whether or not the object implements **ISupportErrorInfo**. The description of a failed **WScript.Shell** call arrives, although that component refuses the query. A program that reads the slot itself should not make the interface a requirement.

## ICreateErrorInfo and the oleaut32 functions

| Name | Does |
|------|------|
| **CreateErrorInfo** | Returns a new, empty error object through its **ICreateErrorInfo** interface. |
| **ICreateErrorInfo** | **SetGUID**, **SetSource**, **SetDescription**, **SetHelpFile** and **SetHelpContext** fill in the properties that the **IErrorInfo** methods read back. Each returns `S_OK`. |
| **SetErrorInfo** | Stores an **IErrorInfo** in the calling thread's slot, replacing what was there. The first argument is reserved and must be 0. Passing `Nothing` empties the slot. |
| **GetErrorInfo** | Returns the stored object and empties the slot. Returns `S_FALSE` and `Nothing` when the slot is empty. |

The object that **CreateErrorInfo** returns implements **IErrorInfo** as well as **ICreateErrorInfo**. Assigning the **ICreateErrorInfo** variable to an **IErrorInfo** variable queries it for the second interface.

## What twinBASIC does

### A method that raises an error

An error raised in a method that has no handler for it makes twinBASIC return a failure **HRESULT** from the method and leave error information in the slot. The method can raise it with [**Err.Raise**](../../tB/Modules/ErrObject/Raise) or with a statement that fails, such as a division by zero.

The **HRESULT** depends on the number. A number from 1 to 65535 is returned as `&H800A0000` plus the number, so error 5 returns `&H800A0005`. A number made with [**vbObjectError**](../../tB/Modules/Constants/#vbObjectError) is returned unchanged. Error 11, *Division by zero*, raised by a division rather than by **Raise**, returns `&H80020012`, the **IDispatch** code for it.

The object that **GetErrorInfo** returns then holds what the method gave **Raise**:

- **GetSource** returns *source*, and an empty string when **Raise** was called without one.
- **GetDescription** returns *description*. Without one, it returns what [**Err.Description**](../../tB/Modules/ErrObject/Description) holds for the number: the standard text of a built-in run-time error such as 5.
- **GetHelpFile** and **GetHelpContext** return *helpfile* and *helpcontext*, and an empty string and 0 when they were omitted.
- **GetGUID** fails with `E_NOTIMPL` (`&H80004001`): a raised error has no interface identifier.

**GetErrorInfo** empties the slot as COM requires, so a second read returns `Nothing`.

> [!WARNING]
> BETA 997 has a defect: the object does not keep the values it was given, and no error tells the caller. It reads them from the **Err** object each time a method is called. [**Err.Clear**](../../tB/Modules/ErrObject/Clear) empties **Err**, so an object read after it returns empty strings and 0, and the next error changes the values to its own. COM requires an **IErrorInfo** to keep what was stored in it. Read the five properties before calling anything else that clears **Err** or raises an error.

A method that handles an error itself, with [**On Error**](../../tB/Core/On-Error), still leaves the values in **Err** and a returned **IErrorInfo** that shows them, although it returns `S_OK`. A caller reads the slot only after a failure code.

### What the caller sees

A twinBASIC caller of a failed call finds the error in the [**Err**](../../tB/Modules/Information/Err) object, with no code of its own. The fields come from the **IErrorInfo** the method left:

| Field | Set from |
|-------|----------|
| [**Description**](../../tB/Modules/ErrObject/Description) | **GetDescription**, or `Automation error` when the method left no information |
| [**Source**](../../tB/Modules/ErrObject/Source) | **GetSource**, or an empty string |
| [**HelpFile**](../../tB/Modules/ErrObject/HelpFile) | **GetHelpFile**, or an empty string |
| [**HelpContext**](../../tB/Modules/ErrObject/HelpContext) | **GetHelpContext**, or 0 |
| [**Number**](../../tB/Modules/ErrObject/Number) | the **HRESULT**, as follows |

**Number** is the **HRESULT** read as a signed **Long**, with these exceptions, which make the number the one a VBA program expects. An **HRESULT** of the form `&H800Annnn` becomes *nnnn*, so `&H800A0005` becomes 5 and `&H800A0E78` becomes 3704. `E_INVALIDARG` (`&H80070057`) becomes 5, and `DISP_E_DIVBYZERO` (`&H80020012`) becomes 11. A success code, such as 1, raises no error, and **Number** stays 0.

These fields hold what the component supplies. The following call into **WScript.Shell** fails, and the description names the registry key, which no table in twinBASIC could know:

```tb check_run
On Error Resume Next
Dim sh As Object = CreateObject("WScript.Shell")
sh.RegRead "NOROOT\x"
Debug.Print Err.Number       ' -2147024893
Debug.Print Err.Source       ' WshShell.RegRead
Debug.Print Err.Description  ' Invalid root in registry key "NOROOT\x".
```

A component can supply more. A call to **Execute** on a closed **ADODB.Connection** sets **Number** to 3704, **Source** to `ADODB.Connection`, **Description** to `Operation is not allowed when the object is closed.`, **HelpFile** to the path of the ADO Help file and **HelpContext** to its topic number.

Some components supply no source. A failed call into **Scripting.FileSystemObject** sets **Number** to 53 and **Description** to `File not found`, and leaves **Source** empty.

### A failure with no error information

A method can return a failure **HRESULT** without calling **SetErrorInfo**, and so can a twinBASIC method that sets [**Err.ReturnHResult**](../../tB/Modules/ErrObject/ReturnHResult) to a failure code. When the slot is empty, the caller has only the code. **Number** is derived from it as described above, and **Description** is `Automation error` whatever the code is. **Source** and **HelpFile** are empty strings and **HelpContext** is 0.

| **HRESULT** | **Number** | **Description** |
|-------------|------------|-----------------|
| `&H80004005` (`E_FAIL`) | -2147467259 | `Automation error` |
| `&H800A0005` | 5 | `Automation error` |
| `&H80070005` (`E_ACCESSDENIED`) | -2147024891 | `Automation error` |
| `&H8FFF0001` (no meaning) | -1879113727 | `Automation error` |

> [!WARNING]
> BETA 997 has a defect: the slot is not always empty, and no error tells the caller. A handled error leaves in it an object that reads from **Err**, even when the error was handled in twinBASIC code that never read the slot. VB6 leaves the slot empty. When **Err** has been cleared in between, that object has an empty description, so **Description** of a failure that arrived without information is the standard text of the code: `Unspecified error` for `E_FAIL`, `Invalid procedure call or argument` for `&H800A0005` and `Access is denied.`, in the language of the system, for `E_ACCESSDENIED`. A program that must tell failures apart reads **Number** and does not rely on **Description** for a code that arrived without information.

### A method that sets error information itself

A twinBASIC method can set the slot itself, with the functions above, and then fail with **Err.ReturnHResult**. A twinBASIC caller then finds the object's values in **Err**, and a caller written in another language finds the object in the slot, as it would for a component written in C++.

The failure code has to be a failure: [**ReturnHResult**](../../tB/Modules/ErrObject/ReturnHResult) with a success code returns normally, and the information stays in the slot until something reads it. A method that calls **SetErrorInfo** and then **Err.Raise** loses what it set, because the raised error replaces it.

## Example

The interface declarations are those under [Declaration](#declaration). A **Worker** class implements **IWorker**, whose three methods fail in three ways: by raising an error, by setting error information itself and returning `E_FAIL`, and by returning a code it is given and nothing else. **IWorkerRaw** declares the same methods as **[PreserveSig]**, with the same interface identifier, so a caller can see the **HRESULT** and read the slot itself.

```tb check_build projname=com-ierrorinfo slot=file
[InterfaceId("6A0B5F80-4C7D-4F29-9D45-0D7C3C1A2E10")]
Private Interface IWorker Extends stdole.IUnknown
    Sub Fail()
    Sub FailWithInfo()
    Sub FailWith(ByVal Hr As Long)
End Interface

[InterfaceId("6A0B5F80-4C7D-4F29-9D45-0D7C3C1A2E10")]
Private Interface IWorkerRaw Extends stdole.IUnknown
    [PreserveSig] Function Fail() As Long
    [PreserveSig] Function FailWithInfo() As Long
    [PreserveSig] Function FailWith(ByVal Hr As Long) As Long
End Interface

Class Worker
    Implements IWorker

    Private Sub Fail() Implements IWorker.Fail
        Err.Raise vbObjectError + 1000, "Demo.Worker", "The worker failed.", "C:\Help\demo.chm", 1001
    End Sub

    Private Sub FailWithInfo() Implements IWorker.FailWithInfo
        Dim creator As ICreateErrorInfo
        CreateErrorInfo creator

        Dim iid As TbGuid
        IIDFromString StrPtr("{6A0B5F80-4C7D-4F29-9D45-0D7C3C1A2E10}"), iid
        creator.SetGUID iid
        creator.SetSource StrPtr("Demo.Worker")
        creator.SetDescription StrPtr("The disk is full.")
        creator.SetHelpFile StrPtr("C:\Help\demo.chm")
        creator.SetHelpContext 2002

        Dim info As IErrorInfo
        Set info = creator
        SetErrorInfo 0, info

        Err.ReturnHResult = &H80004005   ' E_FAIL
    End Sub

    Private Sub FailWith(ByVal Hr As Long) Implements IWorker.FailWith
        Err.ReturnHResult = Hr
    End Sub
End Class
```

A call through **IWorker** raises the run-time error in the caller, and **Err** holds what **Raise** was given:

```tb check_run projname=com-ierrorinfo
Dim w As IWorker = New Worker
On Error Resume Next
w.Fail
Debug.Print Err.Number       ' -2147220504
Debug.Print Err.Source       ' Demo.Worker
Debug.Print Err.Description  ' The worker failed.
Debug.Print Err.HelpFile     ' C:\Help\demo.chm
Debug.Print Err.HelpContext  ' 1001
```

A call through **IWorkerRaw** returns the code as a value, and the caller reads the slot itself. The caller sets a handler first, so that the error raised inside **Fail** has one in the call chain; without it the error is unhandled, and a run from the IDE stops. **GetErrorInfo** empties the slot, so its second call returns `S_FALSE` (1) and no object:

```tb check_run projname=com-ierrorinfo
Dim w As IWorkerRaw = New Worker
On Error Resume Next
Dim hr As Long = w.Fail()
Debug.Print Hex(hr)            ' 800403E8

Dim info As IErrorInfo
Debug.Print GetErrorInfo(0, info)   ' 0
Debug.Print info.GetSource()        ' Demo.Worker
Debug.Print info.GetDescription()   ' The worker failed.
Debug.Print info.GetHelpFile()      ' C:\Help\demo.chm
Debug.Print info.GetHelpContext()   ' 1001

Dim again As IErrorInfo
Debug.Print GetErrorInfo(0, again)  ' 1
Debug.Print again Is Nothing        ' True
```

A method that supplies its own information reaches the caller's **Err** the same way:

```tb check_run projname=com-ierrorinfo
Dim w As IWorker = New Worker
On Error Resume Next
w.FailWithInfo
Debug.Print Err.Number       ' -2147467259
Debug.Print Err.Source       ' Demo.Worker
Debug.Print Err.Description  ' The disk is full.
Debug.Print Err.HelpFile     ' C:\Help\demo.chm
Debug.Print Err.HelpContext  ' 2002
```

A failure code and no information leaves only the code. The sample empties the slot before each call with `SetErrorInfo 0, Nothing`, so that nothing is left in it from the call before:

```tb check_run projname=com-ierrorinfo
Dim w As IWorker = New Worker
On Error Resume Next

SetErrorInfo 0, Nothing
w.FailWith &H80004005
Debug.Print Err.Number & " " & Err.Description   ' -2147467259 Automation error

SetErrorInfo 0, Nothing
w.FailWith &H800A0005
Debug.Print Err.Number & " " & Err.Description   ' 5 Automation error

SetErrorInfo 0, Nothing
w.FailWith &H8FFF0001
Debug.Print Err.Number & " " & Err.Description   ' -1879113727 Automation error
```

### A class that answers for itself

**Worker** has no **ISupportErrorInfo** of its own, and twinBASIC answers `S_OK` for it. **PickyWorker** implements the interface and says `S_FALSE` for any interface but **IWorker**:

```tb check_build projname=com-ierrorinfo slot=file
Class PickyWorker
    Implements IWorker
    Implements ISupportErrorInfo

    Private Sub Fail() Implements IWorker.Fail
    End Sub

    Private Sub FailWithInfo() Implements IWorker.FailWithInfo
    End Sub

    Private Sub FailWith(ByVal Hr As Long) Implements IWorker.FailWith
    End Sub

    Private Sub InterfaceSupportsErrorInfo(ByRef riid As TbGuid) _
            Implements ISupportErrorInfo.InterfaceSupportsErrorInfo
        Dim mine As TbGuid
        IIDFromString StrPtr("{6A0B5F80-4C7D-4F29-9D45-0D7C3C1A2E10}"), mine
        If IsEqualGUID(riid, mine) = 0 Then Err.ReturnHResult = 1   ' S_FALSE
    End Sub
End Class
```

The caller reads [**Err.LastHresult**](../../tB/Modules/ErrObject/LastHresult) in the statement after each call:

```tb check_run projname=com-ierrorinfo
Dim iidWorker As TbGuid, iidOther As TbGuid
IIDFromString StrPtr("{6A0B5F80-4C7D-4F29-9D45-0D7C3C1A2E10}"), iidWorker
IIDFromString StrPtr("{00020400-0000-0000-C000-000000000046}"), iidOther   ' IDispatch

Dim plain As New Worker
Dim s1 As ISupportErrorInfo = plain
s1.InterfaceSupportsErrorInfo iidWorker
Debug.Print Err.LastHresult   ' 0
s1.InterfaceSupportsErrorInfo iidOther
Debug.Print Err.LastHresult   ' 0

Dim picky As New PickyWorker
Dim s2 As ISupportErrorInfo = picky
s2.InterfaceSupportsErrorInfo iidWorker
Debug.Print Err.LastHresult   ' 0
s2.InterfaceSupportsErrorInfo iidOther
Debug.Print Err.LastHresult   ' 1
```

## See Also

- [IDispatch](IDispatch) -- how a late-bound call reports an error, through *pExcepInfo*
- [IUnknown](IUnknown) -- the query a caller makes for **ISupportErrorInfo**
- [Err](../../tB/Modules/Information/Err) object
- [Err.Raise](../../tB/Modules/ErrObject/Raise) method
- [Err.ReturnHResult](../../tB/Modules/ErrObject/ReturnHResult) property
- [Err.LastHresult](../../tB/Modules/ErrObject/LastHresult) property
- [On Error](../../tB/Core/On-Error) statement
- [Implements](../../tB/Core/Implements) statement
- [PreserveSig](../../tB/Core/Attributes#preservesig) attribute
- [Interfaces and CoClasses](../../Features/Language/Interfaces-CoClasses) -- declaring an interface in twinBASIC
