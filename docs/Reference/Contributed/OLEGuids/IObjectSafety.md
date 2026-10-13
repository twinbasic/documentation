---
title: IObjectSafety
parent: OLEGuids Package
permalink: /tB/Packages/Contributed/OLEGuids/IObjectSafety
has_toc: false
---

# IObjectSafety interface
{: .no_toc }

Lets a host ask an object which safety options it supports for an interface, and set them.

**IObjectSafety** has the interface identifier `CB5BDC81-93C1-11CF-8F20-00805F2CD064` and extends **stdole.IUnknown**. It is declared `[OleAutomation(False)]`. Microsoft Learn describes the Windows interface: [IObjectSafety](https://learn.microsoft.com/en-us/previous-versions/windows/internet-explorer/ie-developer/platform-apis/aa768224(v=vs.85)).

A host, such as a web browser that runs scripts, asks an object that may be called by untrusted code whether it agrees to be. An object implements the interface to say that it does. The declaration is complete: it has both methods of the Windows interface. They are **Sub** members, so the HRESULT is hidden: a failure code raises a run-time error, and a class that implements the interface sets [**Err.ReturnHResult**](../../../Modules/ErrObject/ReturnHResult) to return one. Neither method is marked `[PreserveSig]`, so a class can implement the interface.

The safety options are bits in a **Long**:

| Value | Constant | Meaning |
|------:|----------|---------|
| 1 | `INTERFACESAFE_FOR_UNTRUSTED_CALLER` | the interface is safe to call from an untrusted caller |
| 2 | `INTERFACESAFE_FOR_UNTRUSTED_DATA` | the interface is safe to use with untrusted data |
| 4 | `INTERFACE_USES_DISPEX` | the caller knows to use **IDispatchEx** |
| 8 | `INTERFACE_USES_SECURITY_MANAGER` | the caller knows to use **IInternetHostSecurityManager** |

The package does not declare the constants.

## Methods

### GetInterfaceSafetyOptions

```tb inert=signature
Sub GetInterfaceSafetyOptions(ByRef riid As OLEGuids.OLECLSID, ByRef pdwSupportedOptions As Long, ByRef pdwEnabledOptions As Long)
```

Reports the safety options for the interface that *riid* identifies. *pdwSupportedOptions* receives the options the object supports, and *pdwEnabledOptions* the options that are set now.

### SetInterfaceSafetyOptions

```tb inert=signature
Sub SetInterfaceSafetyOptions(ByRef riid As OLEGuids.OLECLSID, ByVal dwOptionSetMask As Long, ByVal dwEnabledOptions As Long)
```

Turns safety options on or off for the interface that *riid* identifies. The bits set in *dwOptionSetMask* select the options to change, and the same bits in *dwEnabledOptions* give their new values: set for on, clear for off.

## Example

This class supports the two "untrusted" options, keeps the ones the host has turned on, and refuses a request for any other option.

```tb check_build slot=file
Class ScriptSafeObject
    Implements IObjectSafety

    Private Const INTERFACESAFE_FOR_UNTRUSTED_CALLER As Long = &H1
    Private Const INTERFACESAFE_FOR_UNTRUSTED_DATA As Long = &H2
    Private Const SUPPORTED As Long = INTERFACESAFE_FOR_UNTRUSTED_CALLER Or INTERFACESAFE_FOR_UNTRUSTED_DATA
    Private Const E_FAIL As Long = &H80004005

    Private m_Enabled As Long

    Private Sub IObjectSafety_GetInterfaceSafetyOptions(ByRef riid As OLECLSID, ByRef pdwSupportedOptions As Long, ByRef pdwEnabledOptions As Long) Implements IObjectSafety.GetInterfaceSafetyOptions
        pdwSupportedOptions = SUPPORTED
        pdwEnabledOptions = m_Enabled
    End Sub

    Private Sub IObjectSafety_SetInterfaceSafetyOptions(ByRef riid As OLECLSID, ByVal dwOptionSetMask As Long, ByVal dwEnabledOptions As Long) Implements IObjectSafety.SetInterfaceSafetyOptions
        If (dwOptionSetMask And Not SUPPORTED) <> 0 Then
            Err.ReturnHResult = E_FAIL
            Exit Sub
        End If
        m_Enabled = (m_Enabled And Not dwOptionSetMask) Or (dwEnabledOptions And dwOptionSetMask)
    End Sub
End Class
```

## See Also

- [OLECLSID](OLECLSID) type -- a class or interface identifier
- [IDispatchUnrestricted](IDispatchUnrestricted) interface -- finds and calls members of an automation object by name or dispatch identifier
