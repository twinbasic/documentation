---
title: Control Property Enhancements
parent: GUI Components
nav_order: 6
permalink: /Features/GUI-Components/Control-Properties
---

# Control Property Enhancements

## TextBox Enhancements

- `TextBox.NumbersOnly` property: Restricts input to 0-9 by setting the `ES_NUMBER` style on the underlying control.
- `TextBox.TextHint` property: Sets the light gray hint text in an empty TextBox (`EM_SETCUEBANNER`).

## Label Enhancements

- `Label.VerticalAlignment` property: Defaults to Top.
- `Label.LineSpacing` property (in twips, default is 0)
- `Label.Angle` property (in degrees, rotates the label text)
- `Label.BorderCustom` property (has suboptions to set size, padding and color of borders independently for each side).

## Timer Enhancements

`Timer.Interval` can now be set to any positive `Long` instead of being limited to 65,535.
