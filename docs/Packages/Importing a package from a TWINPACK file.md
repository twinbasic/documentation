---
title: Importing a Package from a TWINPACK File
parent: Packages
nav_order: 4
permalink: /Packages/Importing-TWINPACK/
---

# Importing a package from a TWINPACK file

To import a package directly from a TWINPACK file (instead of using TWINSERV), follow these steps.

- open the project from which you want to use a package
- open the `Settings` file within it
- navigate to the References section
- select the 'Available Packages' button
![image](Images/d9f1e4d9-1805-47e5-93aa-251151b4e914.png)

- press the 'Import from file...' button:

![image](Images/e35d5955-9e70-4d6e-abd7-748558da75ba.png)



- choose the TWINPACK file you want to import, and then it should appear in the references list (ticked):

![image](Images/4e4b8e4d-2a1c-42e5-8f4b-5a9b3f523ee8.png)

<br>
<br>

- Save the `Settings` and if needed restart the compiler

Now you're ready to use the package!  In the example shown above I added a reference to the CSharpishStringFormater package, and I can now confirm that I can access components from the package in my code:

![image](Images/e9a3fd21-8e6a-4485-b52c-0c041600826b.png)
<br>
<br>