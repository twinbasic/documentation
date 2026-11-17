# VBFLXGRD18 --- working notes

The contributed VBFLXGRD18 package, documented at `docs/Reference/Contributed/VBFLXGRD18/`. This
file holds what its section decided and what is known about the package beyond its pages; the
rules for every contributed package are in [WIP.Contributed.md](WIP.Contributed.md).

VBFLXGRD18's one control, VBFlexGrid, is a folder of topic pages with the members as `###` sections (owner), its enumerations on pages of their own, and its `exclude_from_docs` names the modules only the control calls (`Common`, `VisualStyles`, `VTableHandle`, `VTableInterfaceConstants`, `VBFlexGridBase`).

Its samples run on a real grid: the `contributed-VBFLXGRD18` template's Form1 has one, which the module property `VBFlexGrid1` returns after an explicit `Load Form1`.

Its pictures are of a built program, the `vbflexgrid` setup of `shoot_docs` ([WIP.Screenshots.md](WIP.Screenshots.md)), and its clipboard cases hold the clipboard from a hidden PowerShell (`ClipHolder.twin`).
