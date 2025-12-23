---
title: Windowless Controls vs. Windowed Controls
parent: Features
nav_order: 3
permalink: /Features/Windowless/
---

# Windowless Controls vs. Normal (Windowed) Controls

| Feature | **Windowless Controls** | **Normal Controls** | 
| --- | --- | --- | 
| **Window Handle (hWnd)** | No hWnd; drawn directly on container's Device Context (DC) | Each has its own hWnd | 
| **Performance** | Lower overhead, faster rendering<sup>3</sup> | Higher overhead due to window management | 
| **Transparency & Shape** | Supports transparent backgrounds and non-rectangular regions | Limited to rectangular, opaque regions | 
| **Z-Order Behavior** | Always rendered beneath windowed controls<sup>4</sup> | Can float above other controls | 
| **Input Handling** | Requires manual routing of input (keyboard, mouse) via container | OS handles input natively | 
| **Accessibility** | Needs explicit support via interfaces like `IAccessibleWindowlessSite`<sup>1</sup> | Built-in accessibility support | 
| **Known Issues** | May require custom handling to work around known issues in twinBASIC (e.g., events not firing)<sup>2</sup> | More complete and stable | 
| **Use Case Fit** | Ideal for lightweight, static UI elements (e.g., labels, images) | Best for interactive or focusable controls (e.g., textboxes, buttons) |

---

### ✅ **Benefits of Windowless Controls**

- **Performance Boost**: No hWnd means less GDI overhead—great for forms with many static elements.<sup>3</sup> 
- **Visual Flexibility**: Enables transparent or shaped UI elements (e.g., rounded buttons, overlays).  
- **Resource Efficiency**: Helps avoid hitting system handle limits in control-heavy UIs.

---

### ⚠️ **Drawbacks**

- **Complex Input Handling**: You must manually forward focus, mouse, and keyboard events from the container.  
- **Z-Order Limitations**: Cannot appear above windowed controls—problematic for overlays or tooltips.<sup>4</sup>  
- **Quirks**: twinBASIC has some known issues with windowless control events and other features.<sup>2</sup> 
- **Accessibility Overhead**: Requires extra work to expose accessibility interfaces.<sup>1</sup>

---

<sup>1</sup> [IAccessibleWindowlessSite Interface on Microsoft Learn](https://learn.microsoft.com/en-us/windows/win32/api/oleacc/nn-oleacc-iaccessiblewindowlesssite)

<sup>2</sup> Originally reported in [twinBASIC GitHub Issue #1310 – Windowless Anchor Resizing Bug](https://github.com/twinbasic/twinbasic/issues/1310). Fixed in BETA 162.

<sup>3</sup> Overview of [GDI object handles](https://learn.microsoft.com/en-us/windows/win32/sysinfo/gdi-objects) and [hWnd user object handles](https://learn.microsoft.com/en-us/windows/win32/sysinfo/user-objects)  in Windows UI architecture: [MSDN – Window Resources](https://learn.microsoft.com/en-us/windows/win32/winmsg/window-resources)

<sup>4</sup> Background on Z-order rendering and Windows control layering: [Windows Controls - Z-order](https://learn.microsoft.com/en-us/windows/win32/winmsg/window-features#z-order)

---

## Use Case Examples

### When to Choose Windowless Controls

- **Static UI Elements**: Ideal for labels, decorative images, or non-interactive overlays where performance and visual flexibility are key.  
- **Transparent or Shaped Elements**: Perfect for rounded buttons, custom-shaped overlays, or transparent backgrounds.  
- **Control-Heavy Forms**: Useful in scenarios where system handle limits might be exceeded, such as dashboards with hundreds of static elements.

### When to Choose Normal (Windowed) Controls

- **Interactive Elements**: Best for textboxes, buttons, dropdowns, or any control requiring user input or focus.  
- **Layered UI Components**: Necessary for tooltips, modal dialogs, or any element that needs to float above other controls.  
- **Accessibility Requirements**: Recommended for applications where built-in accessibility support is critical.

### Hybrid Layouts

- **Combining Both Types**: Use windowless controls for static elements and normal controls for interactive ones to balance performance and functionality.  
- **Example Scenario**: A dashboard with static labels and graphs (windowless) alongside interactive filters and buttons (windowed).

---

## Real-World Examples

### 🪟 Windowless Control Examples

- **[SweetIceLolly/VB6-MemoryDC](https://github.com/SweetIceLolly/VB6-MemoryDC)** – A VB6 project demonstrating off-screen rendering using memory device contexts. Great for illustrating custom-drawn, windowless UI elements.  
- **[fafalone/WinDevLib](https://github.com/fafalone/WinDevLib)** – A twinBASIC library with low-level Win32 API wrappers. Includes examples of custom rendering and control logic that bypass hWnds.  
- **[fafalone/EventTrace](https://github.com/fafalone/EventTrace)** – A twinBASIC port of an ETW file activity monitor. Uses lightweight, non-windowed UI elements for performance.

### 🧱 Windowed Control Examples

- **[fafalone/UIRibbonDemos](https://github.com/fafalone/UIRibbonDemos)** – twinBASIC demos of the Windows Ribbon UI framework. Showcases interactive, hWnd-backed controls with full accessibility and Z-order behavior.  
- **[SweetIceLolly/DragControlsIDE](https://github.com/SweetIceLolly/DragControlsIDE)** – A VB6-based IDE-like interface with draggable, windowed controls. Useful for demonstrating layout and anchoring behavior. 
- **[SweetIceLolly/DragControlsIDE-v2](https://github.com/SweetIceLolly/DragControlsIDE-v2)** - an updated version of the above.
- **[bclothier/TwinBasicSevenZip](https://github.com/bclothier/TwinBasicSevenZip)** – A twinBASIC wrapper for 7-Zip COM integration. Includes a UI with standard windowed controls for file selection and progress.

---

### 🖨️ Printing Mixed-Control Forms in VBx/twinBASIC

#### ✅ What Works Out of the Box

* **Windowed controls** (e.g., `TextBox`, `CommandButton`) can often be captured using `Form.DrawToDC` or `PrintForm` in VB6, or by rendering the form’s `hDC` in twinBASIC.
* **Windowless controls**, however, don’t have their own `hWnd` or device context, so they won’t appear unless you explicitly draw them.

---

#### 🧰 Recommended Strategy

1. **Render the Entire Form to a Bitmap**

   * In VB6: Use `BitBlt` or `PaintPicture` to copy the form’s visible area.
   * In TwinBASIC: Use the form’s `Canvas` or `ICustomControl.Paint` logic to manually render windowless elements to a bitmap.

2. **Ensure Windowless Controls Are Painted**

   * For custom controls using `ICustomControl.Paint`, call their paint routines manually into the same bitmap or `DC`.
   * If using `Canvas.AddElement`, simulate a paint pass with the same layout logic used during runtime.

3. **Send the Bitmap to the Printer**

   * Use `Printer.PaintPicture` in VB6 or `Printer.Canvas.DrawImage` in twinBASIC (if available).
   * Alternatively, use `GDI` or `GDI+` APIs to send the bitmap to the printer’s `DC`.

---

#### 🧪 Tips for Accuracy

* **Z-Order Matters**: Since windowless controls render behind windowed ones, draw them first.
* **DPI Awareness**: Match the printer’s DPI to your form’s layout scale to avoid blurry output.
* **Off-Screen Rendering**: Consider rendering to a memory `DC` or `StdPicture` object before printing to avoid flicker or partial paints.

---

#### Code Snippet for twinBASIC

``` vb
' Example: Printing a Mixed-Control Form in twinBASIC
Dim bmp As StdPicture
Set bmp = CreateCompatibleBitmap(Me.Width, Me.Height)

' Render windowless controls
For Each ctrl In Me.Controls
    If TypeOf ctrl Is ICustomControl Then
        ctrl.Paint bmp.Canvas
    End If
Next

' Render windowed controls 
Me.DrawToDC bmp.Canvas

' Send to printer 
Printer.Canvas.DrawImage bmp, 0, 0
Printer.EndDoc
```
---

For DPI-aware, multi-monitor layout work, windowless controls can be a powerful tool—especially for static or decorative elements—but they demand more orchestration when interactivity or layering is involved. If you're building a hybrid layout, a mix of both types might give you the best of both worlds.
