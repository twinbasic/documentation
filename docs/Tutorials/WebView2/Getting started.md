---
title: Getting Started
parent: WebView2
grand_parent: Tutorials
nav_order: 1
permalink: /Tutorials/WebView2/Getting-Started
redirect_from:
  - /WebView2/Getting-Started
---

# Getting Started

## Package requirements

To create projects that use WebView2, your projects must include both the `WinNativeForms` package and the `WebView2` package in your projects.  

Both of these packages can be added through the `Project` > `References` menu option, which opens Project Settings at its Library References, and the **Available Packages** tab.  Ensure both packages are ticked, and then apply the changes and restart the compiler.

![The Library References list of Project Settings on its Enabled Libraries tab, with the WebView2 and WinNativeForms packages (the latter listed as the VB Compatibility Package) ticked among the VBA, VBRUN and OLE Automation libraries](Images/tbWebView2References.png){:width="1102" height="226"}
<br>
<br>

Once you've added the package references, you should find that the WebView2 control is now available to you in the form designer:

![The TOOLBOX with a form open, and a red arrow pointing at the WebView2 control's tile under the WebView2Package heading](Images/tbWebView2Toolbox.png){:width="196" height="366"}
<br>
<br>

## Create a WebView2 control on a form

We use the WebView2 control just like any ordinary control:

![Animation of a WebView2 control being drawn onto a blank form in the designer](Images/tbWebView2InAForm.gif){:style="width:60%; height:auto;"}
<br>
<br>

## WebView2 control properties

There are lots of WebView2 properties and events to experiment with. The control's own properties are in the **GENERAL** group of the PROPERTIES panel:

![The PROPERTIES panel for a WebView2 control named Web1, showing its GENERAL group, from AdditionalAllowedFrameAncestors to ZoomFactor, most of them ticked True](Images/tbWebView2Properties.png){:width="500" height="525"}
<br>
<br>
For what each property does, see the [WebView2 control class](../../tB/Packages/WebView2/WebView2/); for the underlying browser feature, try searching the official <a href="https://docs.microsoft.com/en-us/microsoft-edge/webview2/">WebView2 documentation</a>

## Samples

If you prefer to start with a sample, have a look at `Sample 1a. WebView2 Examples`, available in the new-project dialog:

![The New / Open Project dialog on the Samples tab, with a red arrow pointing at the title of Sample 1a. WebView2 Examples](Images/tbWebView2Sample0.png){:width="522" height="405"}
