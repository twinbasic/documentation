---
title: Importing a Package from a TWINPACK File
parent: Package Management
grand_parent: Features
nav_order: 3
permalink: /Features/Packages/Importing-TWINPACK
redirect_from:
  - /Packages/Importing-TWINPACK
---

# Importing a package from a TWINPACK file

To import a package directly from a TWINPACK file (instead of using TWINSERV), follow these steps.

- open the project from which you want to use a package
- open the `Settings` file within it
- navigate to the **Library References** section
- select the **Available Packages** tab
![Numbered callouts on the Project Settings icon, the Library References section and the Available Packages tab](Images/d9f1e4d9-1805-47e5-93aa-251151b4e914.png)
- press the **Import from file...** button:
![A callout marking the Import from file button below the Available Packages list](Images/e35d5955-9e70-4d6e-abd7-748558da75ba.png)
- choose the TWINPACK file you want to import. The package is added to the **Available Packages** list, but BETA 983 does not tick it: tick it yourself. It then appears, ticked, on the **Enabled Libraries** tab:
![The Enabled Libraries list with the imported CSharpishStringFormater and FilePropertyExplorer packages ticked](Images/4e4b8e4d-2a1c-42e5-8f4b-5a9b3f523ee8.png)
- press **Apply Changes**

A project cannot import a package it already contains. If it holds an earlier build of the same package, the import is refused with `Failed to add package; '<name>' conflicts with an existing imported package.`, whatever the new build's Version. To replace the earlier build, see [Updating a package you built yourself](Updating#updating-a-package-you-built-yourself).

<br>

Now you're ready to use the package!  In the example shown above I added a reference to the CSharpishStringFormater package, and I can now confirm that I can access components from the package in my code:

![The code editor offering completions from the Fmt namespace after typing fmt followed by a dot](Images/e9a3fd21-8e6a-4485-b52c-0c041600826b.png)
<br>
<br>