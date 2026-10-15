---
title: InstalledFontCollection
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/InstalledFontCollection
has_toc: false
---

# InstalledFontCollection class
{: .no_toc }

The font families installed on the system.

**InstalledFontCollection** lists the families that every program can use. It inherits [**FamilyCount**](FontCollection#familycount) and [**Families**](FontCollection#families) from [**FontCollection**](FontCollection) and adds nothing. It is read-only: fonts are installed and removed through Windows, not through this class. The class mirrors the GDI+ [InstalledFontCollection](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusheaders/nl-gdiplusheaders-installedfontcollection) class.

A [**FontFamily**](FontFamily) or a [**Font**](Font) that is created without a collection looks in the installed fonts, so this class is needed only to list them.

## Creating

Syntax: *collection* **= InstalledFontCollection**( )

Syntax: *collection* **= New InstalledFontCollection**

> [!WARNING] 0.9.45.0, BETA 1005
> Creating an **InstalledFontCollection** raises run-time error 438, *Object doesn't support this property or method*, and the result is **Nothing**. The statement `Debug.Assert TypeOf (Me) Is InstalledFontCollection` in the class raises it. Even with that statement removed, the constructor does not store the native collection it creates, so the object has no handle and every call on it fails with **InvalidParameter**. The class cannot be used until a version of the package corrects both.

```tb check_build
Dim user As GdiPlusUser = GdiPlusUser()

Dim fonts As InstalledFontCollection = InstalledFontCollection()
Dim families() As FontFamily = fonts.Families
Debug.Print "Installed families: " & fonts.FamilyCount
Debug.Print "The first one: " & families(1).FamilyName
```

## See Also

- [FontCollection](FontCollection) class -- the members this class inherits
- [PrivateFontCollection](PrivateFontCollection) class -- fonts for one program only
- [FontFamily](FontFamily) class
- [InstalledFontCollection class](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusheaders/nl-gdiplusheaders-installedfontcollection) -- Microsoft's GDI+ reference
