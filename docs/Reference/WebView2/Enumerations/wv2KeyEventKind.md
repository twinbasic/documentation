---
title: wv2KeyEventKind
parent: Enumerations
grand_parent: WebView2 Package
permalink: /tB/Packages/WebView2/Enumerations/wv2KeyEventKind
---
# wv2KeyEventKind
{: .no_toc }

The kind of accelerator-key keyboard message that fired the [**AcceleratorKeyPressed**](../WebView2/#acceleratorkeypressed) event, carried as its **ByRef** `KeyState` argument. Mirrors the `COREWEBVIEW2_KEY_EVENT_KIND` enumeration.

| Constant | Value | Description |
|----------|-------|-------------|
| **wv2EventKeyDown**{: #wv2EventKeyDown } | 0 | Raised from a `WM_KEYDOWN` message. |
| **wv2EventKeyUp**{: #wv2EventKeyUp } | 1 | Raised from a `WM_KEYUP` message. |
| **wv2EventSystemKeyDown**{: #wv2EventSystemKeyDown } | 2 | Raised from a `WM_SYSKEYDOWN` message — e.g. **Alt+** *key*. |
| **wv2EventSystemKeyUp**{: #wv2EventSystemKeyUp } | 3 | Raised from a `WM_SYSKEYUP` message. |
