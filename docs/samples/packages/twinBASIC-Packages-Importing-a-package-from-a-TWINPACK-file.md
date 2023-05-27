### Importing a package from a TWINPACK file

To import a package directly from a TWINPACK file (instead of using TWINSERV), follow these steps.

- open the project from which you want to use a package
- open the `Settings` file within it
- navigate to the References section
- select the 'TWINPACK PACKAGES' button
- press the 'Import from file...' button:
<img src="https://twinbasic.com/images/wiki/packImportFromTWINPACK.png" alt="Create Package" width="45%">
<br>
<br>

- choose the TWINPACK file you want to import, and then it should appear in the references list (ticked):
<img src="https://twinbasic.com/images/wiki/packImportFromPackageManagerService_Explorer.png" alt="Create Package" width="65%">
<br>
<br>

- close and save the `Settings` file to restart the compiler

Now you're ready to use the package!  In the example shown above I added a reference to the TwinLib64 package, and I can now confirm that I can access components from the TwinLib64 package in my code:

<img src="https://twinbasic.com/images/wiki/packPackageExampleUsage1.png" alt="Create Package" width="40%">
<br>
<br>