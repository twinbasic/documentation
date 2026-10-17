---
title: FontCollection
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/FontCollection
has_toc: false
---

# FontCollection class
{: .no_toc }

The base class of the two classes that hold a set of font families: [**InstalledFontCollection**](InstalledFontCollection) and [**PrivateFontCollection**](PrivateFontCollection).

A **FontCollection** is not created on its own. It gives its two derived classes the members that list the families in the collection. A variable declared **As FontCollection** can hold either of them, which is how the *fontCollection* parameter of [**FontFamily**](FontFamily) and of [**Font**](Font) accepts both. The class mirrors the GDI+ [FontCollection](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusheaders/nl-gdiplusheaders-fontcollection) class.

<!-- test: Fx_FontCollectionTests.InstalledFontCollection_Create_ReturnsACollection, Fx_FontCollectionTests.InstalledFontCollection_New_ReturnsACollection, Fx_FontCollectionTests.InstalledFontCollection_FamilyCount_CountsTheInstalledFamilies, Fx_FontCollectionTests.InstalledFontCollection_Families_IsOneBasedAndHoldsAnArialFamily, Fx_FontCollectionTests.PrivateFontCollection_Create_ReturnsAnEmptyCollection, Fx_FontCollectionTests.PrivateFontCollection_New_ReturnsACollection, Fx_FontCollectionTests.PrivateFontCollection_AddFontFile_AddsTheFamilyOfTheFile, Fx_FontCollectionTests.PrivateFontCollection_AddFontFile_MissingFile_ReturnsFileNotFound, Fx_FontCollectionTests.PrivateFontCollection_FontFromTheCollection_IsAvailable -->
> [!WARNING] 0.9.45.0, BETA 1010
> Neither derived class can be created, so none of the members on this page can be used. See the warning on [**InstalledFontCollection**](InstalledFontCollection#creating) and on [**PrivateFontCollection**](PrivateFontCollection#creating). The rest of this page describes the members as the source defines them.

## Creating

A **FontCollection** cannot be created. Create an [**InstalledFontCollection**](InstalledFontCollection#creating) or a [**PrivateFontCollection**](PrivateFontCollection#creating) instead.

## Members

### FamilyCount
{: .no_toc }

Syntax: *count* **=** *collection*.**FamilyCount**

Returns a **Long** with the number of font families in the collection.

### Families
{: .no_toc }

Syntax: *families* **=** *collection*.**Families**( )

Returns an array of [**FontFamily**](FontFamily) objects, one for each family in the collection. The array is one-based: the lowest index is 1 and the highest is **FamilyCount**. When the call fails, nothing is returned.

A collection with no families has no array to return, and the call raises a run-time error. Check **FamilyCount** first when the collection may be empty.

```tb check_build
Dim user As GdiPlusUser = GdiPlusUser()

Dim fonts As FontCollection = InstalledFontCollection()
Dim families() As FontFamily = fonts.Families
Dim i As Long
For i = 1 To fonts.FamilyCount
    Debug.Print families(i).FamilyName
Next
```

## See Also

- [InstalledFontCollection](InstalledFontCollection) class -- the fonts installed on the system
- [PrivateFontCollection](PrivateFontCollection) class -- fonts loaded from files or memory for one program
- [FontFamily](FontFamily) class -- one member of a collection
- [Font](Font) class
- [FontCollection class](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusheaders/nl-gdiplusheaders-fontcollection) -- Microsoft's GDI+ reference
