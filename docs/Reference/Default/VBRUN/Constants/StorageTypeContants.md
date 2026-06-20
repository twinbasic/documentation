---
title: StorageTypeContants
parent: Constants Module
grand_parent: VBRUN Package
permalink: /tB/Packages/VBRUN/Constants/StorageTypeContants
---
# StorageTypeContants
{: .no_toc }

OLE data-storage medium identifiers used by [**DataObjectFormat.StorageType**](../DataObject/DataObjectFormat#storagetype) and other low-level data-transfer routines, identifying how the bytes are physically stored.

> [!NOTE]
> The enum is named `StorageTypeContants` (note the missing `s`) in the runtime --- a long-standing VB6 holdover that twinBASIC preserves for source compatibility.

| Constant | Value | Description |
|----------|-------|-------------|
| **vbHGlobal**{: #vbHGlobal } | 1 | A global memory handle (`HGLOBAL`). |
| **vbFile**{: #vbFile } | 2 | A path to a file on disk. |
| **vbIStream**{: #vbIStream } | 4 | An `IStream` interface pointer. |
| **vbIStorage**{: #vbIStorage } | 8 | An `IStorage` interface pointer. |
| **vbGDI**{: #vbGDI } | 16 | A GDI object handle. |
| **vbMetaFile**{: #vbMetaFile } | 32 | A Windows metafile handle. |
| **vbEnhancedMetaFile**{: #vbEnhancedMetaFile } | 64 | An enhanced metafile handle. |
