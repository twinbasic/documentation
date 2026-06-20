---
title: Printers
parent: VB Package
permalink: /tB/Packages/VB/Printers/
has_toc: false
---

# Printers class
{: .no_toc }

A **Printers** object is a read-only collection of every printer installed on the system. It is exposed through the implicit **Printers** global --- there is no user-callable constructor --- and yields a [**Printer**](../Printer/) for each device, keyed by its **DeviceName**. Use it to enumerate the installed devices, or to switch the active printer with `Set Printer = Printers(name)`.

```tb
Dim p As Printer
For Each p In Printers
    Debug.Print p.DeviceName, p.DriverName, p.Port
Next

Set Printer = Printers("HP LaserJet")    ' make this the active printer
```

* TOC
{:toc}

## What the collection contains

Each entry is a [**Printer**](../Printer/) bound to the corresponding device. These instances are **immutable** descriptors --- they are intended for identification and for handing to `Set Printer = …`, not for running a print job directly. Assigning any of the settings properties on one raises run-time error 383 (*Property is read-only*); calling [**EndDoc**](../Printer/#enddoc), [**KillDoc**](../Printer/#killdoc), [**NewPage**](../Printer/#newpage), [**Print**](../Printer/#print), or the other document-control methods raises run-time error 438 (*Object doesn't support this property or method*). [**TrackDefault**](../Printer/#trackdefault) is always **False** on these instances.

A driver that advertises a single device over multiple ports produces one [**Printer**](../Printer/) entry per port; only the first such entry is keyed by **DeviceName**, the rest are accessible only by numeric index.

## Live enumeration

The collection is **not cached**. Every call to [**Count**](#count), [**Item**](#item), or `For Each` re-reads the system's installed-printers list from the Windows registry's profile section and reconstructs a fresh batch of [**Printer**](../Printer/) instances. A printer added or removed in **Settings → Printers** therefore appears the next time the collection is touched, with no need to refresh anything from code. The trade-off is that consecutive accesses are not cheap --- when enumerating, cache the result if many lookups are needed:

```tb
Dim snapshot As Variant : snapshot = Array()      ' or use a Collection
For Each p In Printers
    snapshot = Array(snapshot, p.DeviceName)      ' (illustrative)
Next
```

## Indexing

Numeric indexing is **0-based**, in contrast with most VB6 collections, which are 1-based. The first installed printer is `Printers(0)`; the last is `Printers(Printers.Count - 1)`. An index outside that range raises run-time error 9 (*Subscript out of range*).

String indexing looks up by **DeviceName** --- new in twinBASIC; VB6's **Printers** supports only numeric access. A name that is not present raises the underlying collection's run-time error 5 (*Invalid procedure call or argument*).

## Properties

### Count
{: .no_toc }

The number of installed printer entries. **Long**, read-only. Re-counted on every access --- see [Live enumeration](#live-enumeration).

Syntax: *object*.**Count**

### Item
{: .no_toc }

Returns the [**Printer**](../Printer/) at the given index. **Default property** --- `Printers(0)` is shorthand for `Printers.Item(0)`.

Syntax: *object*.**Item**( *Index* ) **As Printer**

*Index*
: *required* A **Variant**. As a **Long**, the zero-based position in the collection (`0` to `Count - 1`); out-of-range values raise run-time error 9. As a **String**, the **DeviceName** of the printer; an unknown name raises run-time error 5.

## See Also

- [Printer](../Printer/) -- the printer object itself, and the implicit **Printer** global.
