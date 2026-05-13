---
title: AsyncTypeConstants
parent: Constants Module
grand_parent: VBRUN Package
permalink: /tB/Packages/VBRUN/Constants/AsyncTypeConstants
---
# AsyncTypeConstants
{: .no_toc }

The kind of data being delivered by **UserControl.AsyncRead**, also reported back through [**AsyncProperty.AsyncType**](../AsyncProperty/AsyncType).

| Constant | Value | Description |
|----------|-------|-------------|
| **vbAsyncTypePicture**{: #vbAsyncTypePicture } | 0 | The data is delivered as an **stdole.IPictureDisp**. |
| **vbAsyncTypeFile**{: #vbAsyncTypeFile } | 1 | The data is downloaded to a temporary file; **Value** holds the file's path. |
| **vbAsyncTypeByteArray**{: #vbAsyncTypeByteArray } | 2 | The data is delivered as a **Byte** array. |
