---
title: Copy Paste Ex
parent: Community Add Ins
# nav_order: 
permalink: /tB/IDE/AddIns/Community/CopyPasteEx
---

## Copy Paste Ex

The CopyPasteEx add-in enhances file management within twinBASIC by introducing a seamless copy/paste capability for Project Explorer Files across multiple twinBASIC instances. 
By leveraging the system clipboard, this add-in enables efficient file transfers, 
ensuring a smooth workflow for developers working on multiple projects.

> Latest Release: [v0.9.4](https://github.com/sokinkeso/CopyPasteEx-Addin-for-twinBASIC/releases/tag/v0.9.4)

Developer: @sokinkeso (Community)

![CopyPasteEx](Images/CopyPasteEx.png "CopyPasteEx")

### Features

1) Uses system clipboard to enable copy/paste functionality for files between twinBASIC instances.
  
2) Copying files via the [Copy (Project Explorer Files)] button:
  - Copies selected files to the clipboard in a custom binary clipboard format.
  - Allows selecting multiple files using Ctrl or Shift keys.

3) Pasting files via the [Paste (Project Explorer Files)] button:
   - Pastes copied files into a selected folder or the parent folder of the selected item.
   - If a file already exists in the destination, a dialog prompts the user to decide whether to overwrite or not.

4) Exclusions from copying:
   - Folders
   - Hidden items
   - Items inside special folder's path (except Sources and Resources)
     e.g.
     
          \Packages\VB\CHANGELOG.md   		cannot be copied
     
          \References\stdole          		cannot be copied
     
          \Sources\Form1.twin         		can be copied
     
          \Resources\ICON\twinBASIC.ico	   	can be copied
     
> [!IMPORTANT]  
> **To install this addin in TwinBasic, just unzip and copy each architecture dll in the corresponding folder**
> \twinBASIC_IDE_BETA_xxx\addins\win32\
> \twinBASIC_IDE_BETA_xxx\addins\win64\

## Download

- http://github.com/sokinkeso/CopyPasteEx-Addin-for-twinBASIC/releases

## Links

- https://github.com/sokinkeso/CopyPasteEx-Addin-for-twinBASIC
