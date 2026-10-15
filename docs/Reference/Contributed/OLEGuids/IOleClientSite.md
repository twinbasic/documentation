---
title: IOleClientSite
parent: OLEGuids Package
permalink: /tB/Packages/Contributed/OLEGuids/IOleClientSite
has_toc: false
---

# IOleClientSite interface
{: .no_toc }

Names the container-side site of an embedded OLE object; declared here as a stub with no methods.

<!-- test: ImplementTests.IOleClientSite_AnswersToItsIdentifier -->
**IOleClientSite** has the interface identifier `00000118-0000-0000-C000-000000000046` and extends **stdole.IUnknown**. It is declared `[OleAutomation(False)]`. Its description marks it as a stub and points to the tbShellLib package for the full version.
<!-- /test -->

In Windows, a container implements the interface to give an embedded object the services of its site: saving the object, naming its moniker and container, showing it, and resizing it. Microsoft Learn describes the Windows interface: [IOleClientSite](https://learn.microsoft.com/en-us/windows/win32/api/oleidl/nn-oleidl-ioleclientsite).

The stub declares none of those methods, so nothing can be called through a variable of this type. The type exists so that other declarations of the package can name it: [**IOleObject.SetClientSite**](IOleObject#setclientsite) takes one, [**IOleObject.GetClientSite**](IOleObject#getclientsite) and [**IRichEditOle.GetClientSite**](IRichEditOle#getclientsite) return one, and [**IOleObject.DoVerb**](IOleObject#doverb) takes one as its active site.

## See Also

- [IOleObject](IOleObject) interface -- connects an embedded object to its site
- [IRichEditOle](IRichEditOle) interface -- the OLE objects in a Rich Edit control
- [IOleInPlaceSite](IOleInPlaceSite) interface -- the site for in-place activation
