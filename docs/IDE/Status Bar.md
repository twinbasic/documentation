---
title: Status Bar
parent: IDE
# nav_order: 2
permalink: /tB/IDE/Project/StatusBar
---

# Status Bar

![The full width of the status bar: a red tB Services: UNAVAILABLE badge and an olive COMMUNITY EDITION badge at the left, each with a warning triangle, then the Ko-fi, Discord, Twitter and GitHub icons, and dimmed text reading tbProject_Close at the far right.](Images/StatusBar.png)

The Status Bar runs along the bottom of the IDE window. It has four regions, left to right: the health of the backend services, the active licence tier, links to community resources, and the name of the command currently under the mouse cursor.

## Services

![A red status bar badge with a warning triangle, reading tB Services: UNAVAILABLE.](Images/Services_Unavailable.png)

![The tooltip that badge shows on hover, four lines giving COMPILER, FS, LSP and DEBUGGER each as Disconnected.](Images/Services_Unavailable_Tooltip.png)

![An olive status bar badge with a warning triangle, reading tB Services: LIMITED.](Images/Services_Limited.png)

![A green status bar badge with a tick, reading tB Services: OPERATIONAL.](Images/Services_Operational.png)

![The tooltip that badge shows on hover, four lines giving COMPILER, FS, LSP and DEBUGGER each as OPERATIONAL.](Images/Services_Operational_Tooltip.png)

COMPILER: Disconnected / OPERATIONAL

FS: Disconnected / OPERATIONAL

LSP: Disconnected / OPERATIONAL

- [Language Server Protocol](https://microsoft.github.io/language-server-protocol/)

DEBUGGER: Disconnected / OPERATIONAL

## Licence

- [Pre Order](https://twinbasic.com/preorder.html)

![An olive status bar badge with a warning triangle, reading COMMUNITY EDITION.](Images/Licence_CommunityEdition.png)

- Community Edition
- Professional Edition
- Ultimate Edition

## Links

![Four white icons at the right of the status bar: a Ko-fi coffee cup holding a heart, the Discord face, the Twitter bird and the GitHub cat.](Images/Links.png)

- https://ko-fi.com/twinbasic
- https://discord.com/invite/UaW9GgKKuE
- http://x.com/waynephillipsea
- https://github.com/twinbasic/twinbasic

## Status

The rightmost region names the command a click would trigger --- the command under the mouse cursor. It gives the IDE's internal command identifier rather than the menu caption, so pointing at **Close Project** on the File menu shows **tbProject_Close**, as in the screenshot at the top of this page.

The name stays on screen after that command has run. It is replaced only when the pointer moves over another control that has a command of its own, and the region is blanked when the pointer moves into an area with no such control.

These are the same identifiers the keyboard shortcut map is keyed by --- see [Window](Menu/Window) for the full list and the keys bound to each one.
