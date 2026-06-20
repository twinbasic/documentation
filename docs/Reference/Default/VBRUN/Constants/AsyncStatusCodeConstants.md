---
title: AsyncStatusCodeConstants
parent: Constants Module
grand_parent: VBRUN Package
permalink: /tB/Packages/VBRUN/Constants/AsyncStatusCodeConstants
---
# AsyncStatusCodeConstants
{: .no_toc }

Status codes reported by [**AsyncProperty.StatusCode**](../AsyncProperty/StatusCode) during an **AsyncReadProgress** notification, identifying which step of the download is currently in progress.

| Constant | Value | Description |
|----------|-------|-------------|
| **vbAsyncStatusCodeError**{: #vbAsyncStatusCodeError } | 0 | An error has occurred during the read. |
| **vbAsyncStatusCodeFindingResource**{: #vbAsyncStatusCodeFindingResource } | 1 | The runtime is locating the target server. |
| **vbAsyncStatusCodeConnecting**{: #vbAsyncStatusCodeConnecting } | 2 | A connection to the target server is being established. |
| **vbAsyncStatusCodeRedirecting**{: #vbAsyncStatusCodeRedirecting } | 3 | The request is being redirected to a different URL. |
| **vbAsyncStatusCodeBeginDownloadData**{: #vbAsyncStatusCodeBeginDownloadData } | 4 | The download of the resource data is starting. |
| **vbAsyncStatusCodeDownloadingData**{: #vbAsyncStatusCodeDownloadingData } | 5 | The resource data is being received. |
| **vbAsyncStatusCodeEndDownloadData**{: #vbAsyncStatusCodeEndDownloadData } | 6 | The resource data has finished downloading. |
| **vbAsyncStatusCodeUsingCachedCopy**{: #vbAsyncStatusCodeUsingCachedCopy } | 10 | The resource is being served from the local cache rather than the network. |
| **vbAsyncStatusCodeSendingRequest**{: #vbAsyncStatusCodeSendingRequest } | 11 | The request is being sent to the server. |
| **vbAsyncStatusCodeMIMETypeAvailable**{: #vbAsyncStatusCodeMIMETypeAvailable } | 13 | The MIME type of the resource is now known. |
| **vbAsyncStatusCodeCacheFileNameAvailable**{: #vbAsyncStatusCodeCacheFileNameAvailable } | 14 | The local cache filename for the resource is now known. |
| **vbAsyncStatusCodeBeginSyncOperation**{: #vbAsyncStatusCodeBeginSyncOperation } | 15 | A synchronous portion of the operation is starting. |
| **vbAsyncStatusCodeEndSyncOperation**{: #vbAsyncStatusCodeEndSyncOperation } | 16 | A synchronous portion of the operation has finished. |
