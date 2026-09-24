---
title: Package Management
parent: Features
nav_order: 6
permalink: /Features/Packages/
redirect_from:
  - /Packages
  - /Packages/What-Is
---

# Package Management

In twinBASIC, a *package* is a collection of components that you can reference from another twinBASIC project.  The components can be modules, classes or interfaces.

twinBASIC comes complete with a package manager service called TWINSERV[^1], allowing you to share and distribute TWINPACK packages to other twinBASIC developers.

A twinBASIC package is distributed as a TWINPACK file that contains everything needed by the components in that package.  A project that references a TWINPACK package, imports the whole package into the file system of the root project, resulting in no external dependencies.

With TWINPACK packages you group common components together into their own namespace whilst allowing for convenient code reuse without any of the problems often associated with using external DLL libraries.

Please be aware that TWINPACK files currently contain the full source code of your packaged components.  It is planned that we will in future allow for creating binary (compiled) TWINPACK files for developers that hold an Ultimate edition licence of twinBASIC.

## Topics

- [Creating a TWINPACK Package](Creating-TWINPACK) -- packaging twinBASIC components into a distributable TWINPACK file.
- [Importing a Package from TWINSERV](Importing-TWINSERV) -- browsing and installing packages from the TWINSERV online repository.
- [Importing a Package from a TWINPACK File](Importing-TWINPACK) -- installing a package from a local TWINPACK file.
- [Linked Packages](Linked) -- storing a package in a shared location rather than embedding it in each project file.
- [Updating a Package](Updating) -- installing a newer version from TWINSERV, or taking a new build of a package you made yourself into the projects that use it.
- [TWINPACK File Format](File-Format) -- binary format specification for `.twinproj` and `.twinpack` files.
- [Import/Export Tool](Import-Export-Tool) -- unpacking and repacking `.twinproj` and `.twinpack` files from the command line, with the compiler executable or with a standalone script, and keeping a project in Git as plain-text files.
- [Library Symbols](Library-Symbols) -- the name a referenced library's components are qualified with, how to change it, and how to expose a package's private components.

[^1]: A service of TWINBASIC LTD offered to the user community.
