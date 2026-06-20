---
title: AsyncReadConstants
parent: Constants Module
grand_parent: VBRUN Package
permalink: /tB/Packages/VBRUN/Constants/AsyncReadConstants
---
# AsyncReadConstants
{: .no_toc }

Bit flags for the *AsyncReadOptions* argument of **UserControl.AsyncRead**, controlling caching, synchronisation, and offline behaviour for an asynchronous download.

| Constant | Value | Description |
|----------|-------|-------------|
| **vbAsyncReadSynchronousDownload**{: #vbAsyncReadSynchronousDownload } | 1 | The call does not return until the download has finished. |
| **vbAsyncReadOfflineOperation**{: #vbAsyncReadOfflineOperation } | 8 | The runtime should not contact the network if the resource is not already cached. |
| **vbAsyncReadForceUpdate**{: #vbAsyncReadForceUpdate } | &H10 | The cached copy is bypassed and the resource is fetched fresh. |
| **vbAsyncReadResynchronize**{: #vbAsyncReadResynchronize } | &H200 | The cached copy is used only after revalidating it against the server. |
| **vbAsyncReadGetFromCacheIfNetFail**{: #vbAsyncReadGetFromCacheIfNetFail } | &H80000 | If the network request fails, fall back to the cached copy if any. |
