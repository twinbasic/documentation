---
title: Hyperlink Module
parent: VBRUN Package
permalink: /tB/Packages/VBRUN/Hyperlink/
redirect_from:
  - /tB/Modules/Hyperlink
has_toc: false
---

# Hyperlink module

The **Hyperlink** object lets a control or form ask its container to navigate to a target document, the way clicking a link in a browser would. It is used from a control's code through the host's **Hyperlink** property — for example **UserControl.Hyperlink** — and works in containers that participate in browser-style navigation (Internet Explorer, Office binders, and a handful of other hyperlink-aware hosts). When the host does not support hyperlink navigation, the runtime falls back to launching the system's default handler for the target.

```tb
Private Sub HelpButton_Click()
    UserControl.Hyperlink.NavigateTo "https://docs.twinbasic.com/"
End Sub
```

## Members

### GoBack

Asks the container to navigate one step backwards in its history list, as if the user had pressed the browser's **Back** button.

Syntax: *object*.**GoBack**

*object*
: *required* An object expression that evaluates to a **Hyperlink** object.

If there is no previous entry, or if the host does not maintain a history list, the call has no effect (or raises an error, depending on the host).

### GoForward

Asks the container to navigate one step forward in its history list, as if the user had pressed the browser's **Forward** button.

Syntax: *object*.**GoForward**

*object*
: *required* An object expression that evaluates to a **Hyperlink** object.

If there is no next entry, or if the host does not maintain a history list, the call has no effect (or raises an error, depending on the host).

### NavigateTo

Asks the container to navigate to a target document.

Syntax: *object*.**NavigateTo** *Target* [ **,** *Location* [ **,** *FrameName* ] ]

*object*
: *required* An object expression that evaluates to a **Hyperlink** object.

*Target*
: *required* A **String** giving the destination — a URL, a UNC path, or a local file path. The container is responsible for resolving the string and dispatching it to the right handler.

*Location*
: *optional* A **String** naming an anchor or bookmark within *Target* — for example the fragment after `#` in an HTML URL — that the container should scroll to once the document has been loaded.

*FrameName*
: *optional* A **String** naming a frame within an HTML frameset that should receive the navigation, instead of the top-level window. Ignored by hosts that do not understand HTML frames.

If the host implements browser-style navigation, the new target is added to the history list so subsequent [**GoBack**](#goback) and [**GoForward**](#goforward) calls work as expected.
