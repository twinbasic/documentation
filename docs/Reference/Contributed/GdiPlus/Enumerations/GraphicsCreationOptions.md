---
title: GraphicsCreationOptions
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/GraphicsCreationOptions
---

# GraphicsCreationOptions enumeration
{: .no_toc }

Says what a **Graphics** object is created from and how it is created.

This enumeration belongs to the package; GDI+ has no counterpart. The members combine with **Or**, and the constructor of [**Graphics**](../Graphics) handles these combinations, with *h1* and *h2* as the two handles it receives:

| Combination | *h1* | *h2* |
|:--|:--|:--|
| **FromHDC** | the device context | not used |
| **FromHDC Or WithHDevice** | the device context | the handle of a device |
| **FromHDC Or Buffered** | the device context | a pointer to the **RECT** to buffer |
| **FromHWND** | the window | not used |
| **FromHWND Or WithICM** | the window | not used |
| **FromHWND Or Buffered** | the window | a pointer to buffered paint parameters, or 0 |

The functions **GraphicsFromHDC**, **GraphicsFromHWND**, **GraphicsFromHWNDWithICM**, **BufferedGraphicsFromHDC** and **BufferedGraphicsFromHWND** choose the combination, and are the easier way to create a **Graphics**.

| Member | Value | Description |
|:-------|:------|:------------|
| **Buffered**{: #Buffered } | `1` | Draws into a buffer, a bitmap in memory, that is copied to the target when the **Graphics** object is released. |
| **FromHWND**{: #FromHWND } | `2` | Creates the object for a window. *h1* is the window handle. |
| **FromHDC**{: #FromHDC } | `4` | Creates the object for a device context. *h1* is the device context handle. |
| **WithHDevice**{: #WithHDevice } | `8` | With **FromHDC**: *h2* is the handle of the device that the context belongs to. |
| **WithICM**{: #WithICM } | `16` | With **FromHWND**: the object uses image colour management (ICM). |
| **Unbuffered**{: #Unbuffered } | `0` | No flag is set: drawing is not buffered. |

## Used by

- [**Graphics**](../Graphics) class: [constructor](../Graphics#creating)
- [**VBGraphics**](../VBGraphics) class: [constructor](../VBGraphics#creating)

## See Also

- [Enumerations](.) -- all the enumerations of the package
- [Graphics](../Graphics) class
- [VBGraphics](../VBGraphics) class
