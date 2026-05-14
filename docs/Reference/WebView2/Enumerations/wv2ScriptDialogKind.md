---
title: wv2ScriptDialogKind
parent: Enumerations
grand_parent: WebView2 Package
permalink: /tB/Packages/WebView2/Enumerations/wv2ScriptDialogKind
---
# wv2ScriptDialogKind
{: .no_toc }

Identifies which JavaScript-dialog primitive the page is trying to open. Passed as the `ScriptDialogKind` argument of the [**ScriptDialogOpening**](../WebView2/#scriptdialogopening) event — the event only fires when **AreDefaultScriptDialogsEnabled** is **False**, so the application can implement its own dialogs. Mirrors the `COREWEBVIEW2_SCRIPT_DIALOG_KIND` enumeration.

| Constant | Value | Description |
|----------|-------|-------------|
| **wv2DialogAlert**{: #wv2DialogAlert } | 0 | `alert()` — a single-message notification with an *OK* button. |
| **wv2DialogConfirm**{: #wv2DialogConfirm } | 1 | `confirm()` — a question with *OK* and *Cancel*. |
| **wv2DialogPrompt**{: #wv2DialogPrompt } | 2 | `prompt()` — a text-input question with *OK* and *Cancel*. |
| **wv2DialogBeforeUnload**{: #wv2DialogBeforeUnload } | 3 | The browser's *Leave this page?* confirmation raised by `beforeunload`. |
