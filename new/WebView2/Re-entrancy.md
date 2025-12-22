---
title: Information about Re-entrancy
parent: WebView2
nav_order: 3
permalink: /WebView2/Re-entrancy/
---

# Information about re-entrancy

The WebView2 API is very particular about not allowing for re-entrancy from its events (see <a href="https://docs.microsoft.com/en-us/microsoft-edge/webview2/concepts/threading-model">Threading model for WebView2 apps</a>).  This means that when we process events such as `NavigationCompleted` we are ordinarily prohibited from doing anything with the WebView2 object model before returning from that event.  So for example, you couldn't navigate to a new URL from within the `NavigivationCompleted` event itself.   

To work around these limitations, our WebView2 implementation defers all event handling by retriggering events through the form message loop.  This allows events to be handled and execution control returns to WebView2 immediately, and then our deferred event gets triggered once WebView2 returns to the main message loop.

Due to the design of our implementation, for the most part you can forget about the re-entrancy limitations imposed by the WebView2 API.  However, if you use the `AddObject` feature of WebView2 which allows you to expose a twinBASIC class instance to javascript, then you need to be aware that there are two modes available for the `AddObject` feature.   

## AddObject(ObjectInstance As Object, UseDeferredInvoke As Boolean)

If you pass `True` to the `UseDeferredInvoke` parameter of the `AddObject` call, then calls that come in to your class instance from javascript will be treated **asynchronously** and so you cannot return a value to javascript.  This is great for event notifications.

If you pass `False` to the `UseDeferredInvoke` parameter of the `AddObject` call, then calls that come in to your class instance from javascript will be treated **synchronously** and so you can return a value to be consumed by javascript, but you MUST ensure that you don't cause re-entrancy, so you MUST NOT make calls back into the WebView2 control methods and properties.  Be warned: if you do make calls back into the WebView2 control when you're not using `UseDeferredInvoke`, then you will cause deadlocks leading to your application becoming unstable and sometimes lingering in the task manager after shutdown.

Note that it is perfectly acceptable to add two separate objects, one for asynchronous event handling (using `UseDeferredInvoke:=True`) and another for synchronous properties (using `UseDeferredInvoke:=False`). 