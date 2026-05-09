---
title: ControlBorderStyleConstantsCustom
parent: Constants Module
grand_parent: VBRUN Modules
permalink: /tB/Packages/VBRUN/Constants/ControlBorderStyleConstantsCustom
---
# ControlBorderStyleConstantsCustom
{: .no_toc }

Border-style values for controls that support a custom-drawn border in addition to the standard options. The enumeration is tagged **\[MustBeQualified\]**, so members must be referenced through the enum name (`ControlBorderStyleConstantsCustom.vbCustomBorder`) to avoid clashing with the similarly named values in [**ControlBorderStyleConstants**](ControlBorderStyleConstants).

| Constant | Value | Description |
|----------|-------|-------------|
| **vbNoBorder**{: #vbNoBorder } | 0 | No border is drawn. |
| **vbFixedSingleBorder**{: #vbFixedSingleBorder } | 1 | A single, non-resizable border. |
| **vbCustomBorder**{: #vbCustomBorder } | 2 | The control raises the events that let user code paint the border itself. |
