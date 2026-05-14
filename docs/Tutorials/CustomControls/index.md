---
title: CustomControls
parent: Tutorials
permalink: /Tutorials/CustomControls
redirect_from:
  - /CustomControls
  - /CustomControls/Introduction
---

# CustomControls

twinBASIC now offers experimental support for CustomControls.  CustomControls are implemented using the BASIC language, allowing implementers to design controls directly from the twinBASIC environment.

A few highlights;   

- completely custom drawn controls, with no external or third-party dependencies (tiny footprint)
- support 32-bit RGBA for full alpha-transparency
- support high-DPI modes (per-monitor), requiring little thought whilst designing new controls
- full debugging support via the usual twinBASIC integrated debugger
- designed for efficiency to support complex controls with hundreds of elements (e.g. a DataGrid with 100's of cells)
- designed for flexibility, allowing for curved corners, multiple borders, background gradients and much more
- the form engine supports anchoring and docking without any considerations needed for CustomControl implementers
- simple property sheet synchronization via the built-in form designer

## See also

- [CustomControls package reference](../tB/Packages/CustomControls/) — the full reference for the built-in `Waynes…` controls and the framework they are built on, including [`ICustomControl`](../tB/Packages/CustomControls/Framework/ICustomControl), [`Canvas`](../tB/Packages/CustomControls/Framework/Canvas), and the style helpers ([`Fill`](../tB/Packages/CustomControls/Styles/Fill), [`Corners`](../tB/Packages/CustomControls/Styles/Corners), [`Borders`](../tB/Packages/CustomControls/Styles/Borders), [`TextRendering`](../tB/Packages/CustomControls/Styles/TextRendering), …)