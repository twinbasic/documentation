---
title: IPerPropertyBrowsingVB
parent: OLEGuids Package
permalink: /tB/Packages/Contributed/OLEGuids/IPerPropertyBrowsingVB
has_toc: false
---

# IPerPropertyBrowsingVB interface
{: .no_toc }

Visual Basic-style versions of three **IPerPropertyBrowsing** methods, which a class can implement.

<!-- test: ImplementTests.IPerPropertyBrowsingVB_AnswersToItsIdentifier -->
**IPerPropertyBrowsingVB** is not a Windows interface. It has the interface identifier `D5D3BBE3-DB60-4522-AF5B-D767FE736DDB` and extends **stdole.IDispatch**. It is not declared `[OleAutomation(False)]`, as the package's Windows interfaces are. Its three methods have the dispatch identifiers 1, 2 and 3 (`[DispId(1)]`, `[DispId(2)]` and `[DispId(3)]`).
<!-- /test -->

It exists because [**IPerPropertyBrowsing**](IPerPropertyBrowsing) has `[PreserveSig]` members, which a twinBASIC class cannot implement. Each method here is a **Sub** that corresponds to one of that interface's methods, and uses Visual Basic types in place of pointers: a **String** for a `BSTR*`, and arrays of **String** and **Long** for the counted arrays. **MapPropertyToPage** has no counterpart.

*Handled* is the first parameter of every method. It is passed by reference, and it is a flag that an implementation which dealt with the call sets to **True**. *DispId* is the dispatch identifier of the property.

## Methods

### GetDisplayString

```tb inert=signature
[DispId(1)]
Sub GetDisplayString(ByRef Handled As Boolean, ByVal DispId As Long, ByRef DisplayName As String)
```

Returns a text string that describes the property, for a property browser to display, in *DisplayName*. Corresponds to [**IPerPropertyBrowsing.GetDisplayString**](IPerPropertyBrowsing#getdisplaystring).

### GetPredefinedStrings

```tb inert=signature
[DispId(2)]
Sub GetPredefinedStrings(ByRef Handled As Boolean, ByVal DispId As Long, ByRef StringsOut As String(), ByRef CookiesOut As Long())
```

Returns the names of the values the property can take, in *StringsOut*, and a cookie for each in *CookiesOut*, at the same position. Corresponds to [**IPerPropertyBrowsing.GetPredefinedStrings**](IPerPropertyBrowsing#getpredefinedstrings).

### GetPredefinedValue

```tb inert=signature
[DispId(3)]
Sub GetPredefinedValue(ByRef Handled As Boolean, ByVal DispId As Long, ByVal Cookie As Long, ByRef Value As Variant)
```

Returns, in *Value*, the value that corresponds to *Cookie*, a cookie that **GetPredefinedStrings** returned. Corresponds to [**IPerPropertyBrowsing.GetPredefinedValue**](IPerPropertyBrowsing#getpredefinedvalue).

## See Also

- [IPerPropertyBrowsing](IPerPropertyBrowsing) interface -- the Windows interface this one corresponds to
- [IOleControlVB](IOleControlVB) interface -- Visual Basic-style **GetControlInfo** and **OnMnemonic**
- [IOleInPlaceActiveObjectVB](IOleInPlaceActiveObjectVB) interface -- Visual Basic-style **TranslateAccelerator**
- [IOleInPlaceObjectWindowlessVB](IOleInPlaceObjectWindowlessVB) interface -- Visual Basic-style **OnWindowMessage**
