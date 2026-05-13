---
title: wv2PermissionState
parent: Enumerations
grand_parent: WebView2 Package
permalink: /tB/Packages/WebView2/Enumerations/wv2PermissionState
---
# wv2PermissionState
{: .no_toc }

The host's decision on a permission request. Carried as the **ByRef** `State` argument of the [**PermissionRequested**](../WebView2/#permissionrequested) event — assign one of these values to control whether the page is granted, denied, or left to the runtime's default behaviour. Mirrors the `COREWEBVIEW2_PERMISSION_STATE` enumeration.

| Constant | Value | Description |
|----------|-------|-------------|
| **wv2StateDefault**{: #wv2StateDefault } | 0 | Let the runtime decide — typically prompts the user. |
| **wv2StateAllow**{: #wv2StateAllow } | 1 | Grant the permission silently. |
| **wv2StateDeny**{: #wv2StateDeny } | 2 | Deny the permission silently. |
