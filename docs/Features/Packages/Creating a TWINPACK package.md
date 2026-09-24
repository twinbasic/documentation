---
title: Creating a TWINPACK Package
parent: Package Management
grand_parent: Features
nav_order: 1
permalink: /Features/Packages/Creating-TWINPACK
redirect_from:
  - /Packages/Creating-TWINPACK
---

# Creating a TWINPACK package

To create a new TWINPACK package, navigate to the twinBASIC New Project dialog, and under the 'Samples' tab, choose the option labelled 'Package':

![The New / Open Project dialog on the Samples tab with Sample 7. Package circled](Images/6ad7a172-0e1b-4276-ac89-042681552507.png)
<br>
<br>

Once you've created the project, you should find the extra 'PACKAGE PUBLISHING' panel as a popup:

![The PACKAGE PUBLISHING panel with EDIT links for Publisher, Namespace, Description, Licence, Visibility and Version, above the PUBLISH THIS PACKAGE button](Images/9eeffbcf-d73e-4a92-bce5-811ed60aba98.png)
<br>
<br>

You should now edit the Namespace, Description, Licence, Visibility and Version properties appropriately by using the package manager 'EDIT' links, which will take you to the individual settings in the `Settings` file.   Once you've edited them, remember to close (and save) the `Settings` file in order for your changes to be reflected in the package manager panel.

- **Namespace:** this is the symbol that will be used to group your components in projects that reference your package.  For example, a package that provides a series of different dialog classes might use the namespace `Dialogs`.
- **Description:** this is the descriptive text that will appear in the `Settings`->`References` list.  If you plan to share this package, think carefully about the description so that others can discover your package through TWINSERV.
- **Licence:** this short text appears in the `Settings`->`References` list, alongside the Description.  If you plan to share this package, it is important that you enter this field, and the value you enter here should appropriately match the content of the LICENCE.md file (e.g. 'MIT', 'LGPL' etc).
- **Visibility:** determines whether the package is visible to only you (PRIVATE) or everyone (PUBLIC).  The value set here only takes effect when you use the 'PUBLISH THIS PACKAGE' button to publish your package in the package manager service, TWINSERV.
- **Version:** the package's version number, in four parts: the **(VERSION) Major**, **(VERSION) Minor**, **(VERSION) Build** and **(VERSION) Revision** settings. A build copies them unchanged into the TWINPACK file, and a project that references the package shows them in the **Version** column of its **Library References** list. TWINSERV refuses to publish a version it already has: the IDE then reports *Package already uploaded with this exact version number.* For a package from a TWINPACK file the IDE does not compare versions at all. It accepts a lower version as well as a higher one, and it refuses to import a package that the project already contains, whatever the version. So raising the Version does not update the projects that use the package; see [Updating a package you built yourself](Updating#updating-a-package-you-built-yourself).

*If you don't plan to publish your package on TWINSERV, then you don't need to fill in the **Licence** or **Visibility** fields.*

You can now create components (Class, Module, Interface) in your project as normal, and when you are finished, it's time to finalize the package.   You have two options;

<br>

## OPTION 1 - Finalize the package into a TWINPACK file

Use this option if you want to just create a local TWINPACK file that you can use in other projects.  For this, the build process is the same as any ordinary twinBASIC build... just hit the Build button in the TWINBASIC toolbar:

![The twinBASIC toolbar with the Build button circled](Images/4d90f313-35d5-426d-8fc3-852ca03382fa.png)
<br>
<br>
![The DEBUG CONSOLE reporting the TWINPACK file being created and the build succeeding](Images/8d74d820-9907-4e76-ac42-71d0233187f1.png)

You'll see the build output notification in the `DEBUG CONSOLE`, as seen above.

Job done.  See [Importing a package from a TWINPACK file](Importing-TWINPACK) for referencing and using the TWINPACK file in other twinBASIC projects. To get a later build of the package into projects that already use it, see [Updating a package you built yourself](Updating#updating-a-package-you-built-yourself).

<br>

## OPTION 2 - Publish the package directly to the package manager service (TWINSERV)

If you're publishing your package onto TWINSERV, you don't need to create the TWINPACK file manually.  Just use the 'PUBLISH THIS PACKAGE' button:

![The TWINBASIC PACKAGE MANAGER panel with arrows pointing to the PUBLISH THIS PACKAGE button](Images/packPublishButton.png){:style="width:45%; height:auto;"}
<br>
<br>

***Publishing packages onto TWINSERV requires you to first create a publisher account.  If you haven't done so, you'll be prompted to do so at this stage.***

You will then be prompted to confirm the package details:

![A confirmation dialog listing the publisher, package namespace, description, version and licence, asking whether to proceed](Images/packPublishPackage1.png){:style="width:65%; height:auto;"}
<br>
<br>

After pressing `YES`, the package will be uploaded to TWINSERV.   Check the `DEBUG CONSOLE` for completion notices:

![The DEBUG CONSOLE showing the publish attempt followed by a successful result](Images/packPublishComplete1.png){:style="width:85%; height:auto;"}

<br>
<br>

 If the package got uploaded successfully, it should be available via TWINSERV within a few moments.   If you've created a `PUBLIC` package, others will be able to see and download it at this point.

See [Importing a package from TWINSERV](Importing-TWINSERV) for referencing and using the uploaded packages.

<br>
<br>

## Special files LICENCE.md and CHANGELOG.md

When you create a new package project, you'll see two additional files created for you in the project filesystem:

![The project file tree with arrows pointing to the CHANGELOG.md and LICENCE.md files](Images/packLicenceFiles.png){:style="width:55%; height:auto;"}
<br>
<br>

If you're publishing a `PUBLIC` package to the package manager service, it is important that you edit these two files before publishing.  These are both markdown files, and will in future become more accessible to users that are considering using your package from TWINSERV. 