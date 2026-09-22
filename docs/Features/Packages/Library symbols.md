---
title: Library Symbols
parent: Package Management
grand_parent: Features
nav_order: 8
permalink: /Features/Packages/Library-Symbols
---

# Library symbols

Every library a project references contributes its components under a *library symbol* --- the name that qualifies them in code. The VBA compatibility package contributes under `VBA`, so `VBA.Strings.Left` names the function; OLE Automation contributes under `stdole`, so `stdole.StdFont` names the class. A symbol is only needed where a name would otherwise be ambiguous, which is why most code never writes one.

The symbol is a property of the *reference*, not of the library, so a project can change it.

## Changing a symbol

Open *Project Settings*, find **Library References**, and select the **Enabled Libraries** tab. The **Library Symbol** column shows the symbol each library currently contributes under, and a pencil icon beside each one opens it for editing.

![The Project Settings dialog, Library References, Enabled Libraries tab. A Name column lists the VBA, VBRUN, OLE Automation and VB libraries, each with a tick box; a Library Symbol column shows VBA, VBRUN, stdole and VB, each followed by a small pencil icon; a Version column follows. The VB row's symbol reads VB struck through with *MyVB on the line beneath it.](Images/LibrarySymbols.png)

A symbol that has been changed is shown as the original struck through, with the replacement beneath it --- the `VB` / `*MyVB` pair in the picture above. That is display only: in code the library is `MyVB`, and `VB` no longer names anything.

## Exposing a library's private symbols

A package's top-level components can be declared **Private**, which keeps them internal to the package. Prefixing the library symbol with an asterisk makes them visible to the referencing project as well.

The asterisk is an instruction rather than part of the name, and is stripped from the symbol. A library set to `*VB` is still written `VB` in code; one set to `*MyVB` is written `MyVB`.

| Library symbol | Public components | Private components |
|----------------|-------------------|--------------------|
| `VB`           | `VB.Form`         | not reachable      |
| `*VB`          | `VB.Form`         | `VB.IVBPrint`      |
| `*MyVB`        | `MyVB.Form`       | `MyVB.IVBPrint`    |

Without the asterisk a private component does not resolve, and the compiler reports *TB5079 Unrecognized datatype symbol*. The name always has to be qualified: exposing the private symbols does not put them in scope unqualified.

> [!NOTE]
> A component is **Private** because the package author did not intend it to be part of the package's interface, so it is internal and may change between releases. That is usually a reason to be deliberate about it rather than a reason not to: a private component may be exactly the right thing to use, and a package author who changes one will say so.

[**IVBPrint**](../../tB/Packages/VB/IVBPrint) in the VB package is a worked example: it is the interface the [**Print**](../../tB/Core/Print) statement dispatches through, and implementing it in a class of your own is what makes that class a valid **Print** target.

## See Also

- [Importing a Package from a TWINPACK File](Importing-TWINPACK) -- installing a package from a local file
- [Import/Export Tool](Import-Export-Tool) -- reading a project's settings outside the IDE
- [**IVBPrint**](../../tB/Packages/VB/IVBPrint) interface -- a private component a project may legitimately want
