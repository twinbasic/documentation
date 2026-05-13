---
title: Notes About the Form Designer
parent: CustomControls
nav_order: 5
permalink: /Tutorials/CustomControls/Form Designer
redirect_from:
  - /CustomControls/Form Designer
---

# Notes About the Form Designer

For the painting of controls in the form designer, CustomControl instances are instantiated and then release immediately after painting has finished. The design-mode flag is exposed on the framework's [`SerializeInfo.RuntimeUISrzIsDesignMode`](../../tB/Packages/CustomControls/Framework/SerializeInfo#runtimeuisrzisdesignmode) — controls that want to render a placeholder only inside the designer (the way [`WaynesTimer`](../../tB/Packages/CustomControls/WaynesTimer) draws its 🕑 glyph) check this flag during [`Initialize`](../../tB/Packages/CustomControls/Framework/ICustomControl#initialize).

## See also

- [CustomControls package reference](../../tB/Packages/CustomControls/) — overview of the framework and the built-in `Waynes…` controls