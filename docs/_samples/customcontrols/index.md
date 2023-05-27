---
Title: Introduction
category: customcontrols
order: 1
---

### Introduction

twinBASIC now offers experimental support for CustomControls.  CustomControls are implemented using the BASIC language, allowing implementers to design controls directly from the twinBASIC environment.

A few highlights;   
- completely custom drawn controls, with no external or third-party dependencies (tiny footprint)
- support 32-bit RGBA for full alpha-transparency
- support high-DPI modes (per-monitor), requiring little thought whilst designing new controls
- full debugging support via the usual twinBASIC integrated debugger
- designed for efficiency so that supporting complex controls with hundreds of elements (e.g. a DataGrid with 100's of cells) is easily possible
- designed for flexibility, allowing for curved corners, multiple borders, background gradients and much more
- the form engine supports anchoring and docking without any considerations needed for CustomControl implementers
- simple property sheet synchronization via the built-in form designer