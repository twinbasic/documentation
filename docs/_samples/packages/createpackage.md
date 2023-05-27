---
title: Creating a TWINPACK package
category: package
order: 1
---

### Creating a TWINPACK package

To create a new TWINPACK package, navigate to the twinBASIC activity panel and choose the option labelled 'Package':

<img src="https://twinbasic.com/images/wiki/packCreatePackage1.png" alt="Create Package" width="55%">
<br>
<br>

Once you've created the project, you should find the extra 'TWINBASIC PACKAGE MANAGER' panel in the main Explorer activity panel:

<img src="https://twinbasic.com/images/wiki/packCreatePackage2.png" alt="Create Package" width="45%">
<br>
<br>

You should now edit the Namespace, Description, Licence and Visibility properties appropriately by using the package manager 'EDIT' links, which will take you to the individual settings in the `Settings` file.   Once you've edited them, remember to close (and save) the `Settings` file in order for your changes to be reflected in the package manager panel.

- **Namespace:** this is the symbol that will be used to group your components in projects that reference your package.  For example, a package that provides a series of different dialog classes might use the namespace `Dialogs`.
- **Description:** this is the descriptive text that will appear in the `Settings`->`References` list.  If you plan to share this package, it is wise to think carefully about the description so that others can find your package easily through TWINSERV.
- **Licence:** this short text appears in the `Settings`->`References` list, alongside the Description.  If you plan to share this package, it is important that you enter this field, and the value you enter here should appropriately match the content of the LICENCE.md file (e.g. 'MIT', 'LGPL' etc).
- **Visibility:** determines whether the package is visible to only you (PRIVATE) or everyone (PUBLIC).  The value set here only takes effect when you use the 'PUBLISH THIS PACKAGE' button to publish your package in the package manager service, TWINSERV.

*If you don't plan to publish your package on TWINSERV, then you don't need to fill in the **Licence** or **Visibility** fields.*

You can now create components (Class, Module, Interface) in your project as normal, and when you are finished, it's time to finalize the package.   You have two options;

<br>

### OPTION 1 - Finalize the package into a TWINPACK file

Use this option if you want to just create a local TWINPACK file that you can use in other projects.  For this, the build process is the same as any ordinary twinBASIC build... just hit the Build button in the TWINBASIC panel:

<img src="https://twinbasic.com/images/wiki/packCreateTWINPACK.png" alt="Create Package" width="95%">
<br>
<br>

You'll see the build output notification in the `DEBUG CONSOLE`, as seen above.

Job done.  See [Importing a package from a TWINPACK file](https://github.com/WaynePhillipsEA/twinbasic/wiki/twinBASIC-Packages-Importing-a-package-from-a-TWINPACK-file) for referencing and using the TWINPACK file in other twinBASIC projects.

<br>

### OPTION 2 - Publish the package directly to the package manager service (TWINSERV)

If you're publishing your package onto TWINSERV, you don't need to create the TWINPACK file manually.  Just use the 'PUBLISH THIS PACKAGE' button:

<img src="https://twinbasic.com/images/wiki/packPublishButton.png" alt="Create Package" width="45%">
<br>
<br>

***Publishing packages onto TWINSERV requires you to first create a publisher account.  If you haven't done so, you'll be prompted to do so at this stage.***

You will then be prompted to confirm the package details:

<img src="https://twinbasic.com/images/wiki/packPublishPackage1.png" alt="Create Package" width="65%">
<br>
<br>

After pressing `YES`, the package will be uploaded to TWINSERV.   Check the `DEBUG CONSOLE` for completion notices:

<img src="https://twinbasic.com/images/wiki/packPublishComplete1.png" alt="Create Package" width="85%">
<br>
<br>

 If the package got uploaded successfully, it should be available via TWINSERV within a few moments.   If you've created a `PUBLIC` package, others will be able to see and download it at this point.

See [Importing a package from TWINSERV](https://github.com/WaynePhillipsEA/twinbasic/wiki/twinBASIC-Packages-Importing-a-package-from-TWINSERV) for referencing and using the uploaded packages.

<br>
<br>

### Special files LICENCE.md and CHANGELOG.md

When you create a new package project, you'll see two additional files created for you in the project filesystem:

<img src="https://twinbasic.com/images/wiki/packLicenceFiles.png" alt="Create Package" width="55%">
<br>
<br>

If you're publishing a `PUBLIC` package to the package manager service, it is important that you edit these two files before publishing.  These are both markdown files, and will in future become more accessible to users that are considering using your package from TWINSERV. 