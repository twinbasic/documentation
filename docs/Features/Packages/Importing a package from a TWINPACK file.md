---
title: Importing a Package from a TWINPACK File
parent: Package Management
grand_parent: Features
nav_order: 3
permalink: /Features/Packages/Importing-TWINPACK
index_also: twinpack
redirect_from:
  - /Packages/Importing-TWINPACK
---

# Importing a package from a TWINPACK file

To import a package directly from a TWINPACK file (instead of using TWINSERV), follow these steps.

- open the project from which you want to use a package
- open the `Settings` file within it
- navigate to the **Library References** section
- select the **Available Packages** tab

  ![Numbered callouts on the Project Explorer's Project Settings gear, the Library References heading and the Available Packages tab](Images/e749e10f-e361-4f15-a977-d756fcb3b5dd.png){:width="1162" height="529"}
- press the **Import from file...** button:

  ![A callout numbered 4 marking the Import from file button below the Available Packages list](Images/e35d5955-9e70-4d6e-abd7-748558da75ba.png){:width="862" height="150"}
- choose the TWINPACK file you want to import. The package is added to the **Available Packages** list, but BETA 1010 does not tick it: tick it yourself. It then appears, ticked, on the **Enabled Libraries** tab, marked `[EMBEDDED-PACKAGE]`:

  ![The Enabled Libraries list with the CSharpishStringFormater and FilePropertyExplorer packages ticked and marked EMBEDDED-PACKAGE](Images/f2fd8374-fe46-40b0-8c66-2443df4dc5b3.png){:width="995" height="257"}
- press **Apply Changes**

A project cannot import a package it already contains. If it holds an earlier build of the same package, the import is refused with `Failed to add package; '<name>' conflicts with an existing imported package.`, whatever the new build's Version. To replace the earlier build, see [Updating a package you built yourself](Updating#updating-a-package-you-built-yourself).

Now you're ready to use the package!  In the example shown above I added a reference to the CSharpishStringFormater package, and I can now confirm that I can access components from the package in my code:

![The code editor offering completions from the Fmt namespace after typing fmt followed by a dot](Images/e2a65dfe-4a9d-4524-b6d6-7a6d1bc35cdb.png){:width="592" height="252"}