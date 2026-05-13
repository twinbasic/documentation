---
title: wv2HostResourceAccessKind
parent: Enumerations
grand_parent: WebView2 Package
permalink: /tB/Packages/WebView2/Enumerations/wv2HostResourceAccessKind
---
# wv2HostResourceAccessKind
{: .no_toc }

How the WebView2 runtime should treat a virtual hostname mapped to a local folder by [**SetVirtualHostNameToFolderMapping**](../WebView2/#setvirtualhostnametofoldermapping) — whether pages on other origins are allowed to fetch from it. Mirrors the `COREWEBVIEW2_HOST_RESOURCE_ACCESS_KIND` enumeration.

| Constant | Value | Description |
|----------|-------|-------------|
| **wv2ResourceDeny**{: #wv2ResourceDeny } | 0 | Only pages served from the same virtual hostname may load resources from the mapped folder. |
| **wv2ResourceAllow**{: #wv2ResourceAllow } | 1 | Default — any page may load resources from the mapped folder. |
| **wv2ResourceDenyCors**{: #wv2ResourceDenyCors } | 2 | Same as **wv2ResourceAllow**, but cross-origin requests are subject to the usual CORS checks. |
