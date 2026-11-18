---
title: Community
nav_order: 10
permalink: /Community/
has_toc: false
index:
  - community contributions
  - third-party
---

# Community

Lists what twinBASIC users write and share: packages, add-ins for the IDE, tools and guides. It also says where the community meets, and how to add a contribution to these lists.

Everything listed here is the work of its author, who publishes and maintains it.

## Packages

A community package is published through TWINSERV, the twinBASIC package registry, and is added to a project from the **Available Packages** tab of **Project → References...**: see [Importing a Package from TWINSERV](../Features/Packages/Importing-TWINSERV). The packages that this documentation covers are in two lists:

- [**Contributed Packages**](../tB/Packages/Contributed/) -- the packages that are ready for use in a program. Their reference is in the Reference Section, with the packages that twinBASIC ships.
- [**Experimental Packages**](../tB/Packages/Experimental/) -- the packages that are not yet ready: the newest version does not compile in the current twinBASIC, or has defects that a program would meet.

Some contributed packages hold controls that replace VB6 controls: a flex grid, the common dialogs. [Controls in contributed packages](../tB/Controls#controls-in-contributed-packages) lists them.

## Add-ins and tools

- [**Community add-ins**](Add-Ins) -- DLLs that the IDE loads: saving the project at an interval, setting the tab order of a form, starting other programs from a panel, and more.
- [**Community tools**](Tools) -- programs of their own that help with twinBASIC: installing a new version, moving code from VB6, editing twinBASIC code in another editor.

## Guides

Mike Wolfe writes about twinBASIC at [nolongerset.com](https://nolongerset.com/tag/twinbasic):

- [Create a Custom ActiveX Control with twinBASIC](https://nolongerset.com/create-activex-control-with-twinbasic/)
- [Create a Tool Window in the VBIDE with twinBASIC](https://nolongerset.com/create-a-vbe-addin-with-twinbasic/)
- [twinBASIC weekly updates](https://nolongerset.com/tag/twinbasic-weekly-update/) -- a summary of each week's twinBASIC news

The [Videos](../Videos) section links to recorded talks and demonstrations.

## Third-party ActiveX controls

twinBASIC programs can use ActiveX controls. [VB6 controls in twinBASIC](../tB/Controls#vb6-controls) lists the controls that came with VB6 and what replaces each one.

For controls from other publishers, reports of how each works in twinBASIC are collected in [issue 276](https://github.com/twinbasic/documentation/issues/276) of the documentation's repository, for a compatibility list on this site.

## Where the community meets

- The [**twinBASIC Discord server**](https://discord.gg/UaW9GgKKuE) -- conversation with other twinBASIC users, the **bugs** channel for reports of defects, and the **show-and-tell** channel, where users post what they have made.
- [**Issues**](https://github.com/twinbasic/twinbasic/issues) of the twinBASIC repository on GitHub -- reports of defects and requests for features.
- [**Discussions**](https://github.com/twinbasic/twinbasic/discussions) of the same repository -- longer conversations about the language and the IDE.
- The [**documentation's repository**](https://github.com/twinbasic/documentation) -- the source of this site, with its own bug tracker.

## Adding to these lists

To share a package, publish it through TWINSERV. [Package Publishing](../tB/IDE/Building/Package-Publishing) describes the publisher account and the steps in the IDE.

To share an add-in, a tool or a guide, add it to its page here: [Authoring](../Documentation/Development/Authoring) describes how to change a page of this documentation. An issue in the [documentation's repository](https://github.com/twinbasic/documentation/issues) that names the contribution and where it is published does as well.
