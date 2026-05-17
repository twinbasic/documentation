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

[^1]: A service of TWINBASIC LTD offered to the user community.
