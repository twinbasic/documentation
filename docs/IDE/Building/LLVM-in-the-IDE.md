---
title: LLVM in the IDE
parent: Building
grand_parent: IDE
nav_order: 5
permalink: /tB/IDE/Building/LLVM-in-the-IDE
index:
  - llvm
  - compiling progress
  - flush the llvm cache
---

# LLVM in the IDE

This page describes what the IDE shows when a project is compiled with LLVM: where the options are, the licence banners, the progress box and the cache. What LLVM is, which options to choose and what the LLVM compiler does not support are in [Getting Started with LLVM](../../../LLVM/Getting-Started).

## Where the options are

The options are in two sections of [Project Settings](../Project-Settings): [*Compiler Options (BUILD)*](../Project-Settings#compiler-options-build) and [*Compiler Options (DEBUG)*](../Project-Settings#compiler-options-debug). Each has a tick box, **Enable LLVM Compilation**, two for optimization and one for each CPU feature.

- **Build** compiles with the *BUILD* options. The file that it writes is the one compiled with LLVM.
- **Start** (<kbd>F5</kbd>) runs the project with the *DEBUG* options. The IDE cannot debug code that LLVM compiled, so the description of this section advises against turning LLVM on there.

The IDE has no **Build with LLVM** button. Both sections are empty in a new project.

The IDE Options has three more, which belong to the compiler and its cache and are not part of any project: the number of threads, the threshold for reporting a complex procedure, and whether the cache process stays alive after the IDE closes. A change to any of them restarts the compiler. See [Compiler and LLVM](../Customising/IDE-Options#compiler-and-llvm).

## The licence banners

LLVM compilation depends on the licence. When the settings dialog is drawn, each of the two sections shows a banner next to the licence badge, if the licence limits it:

- With a **Personal** licence, the banner says that the optimizations apply only to the built-in packages (VB, VBA, VBRUN) and not to your own code, and advises an upgrade to a Professional licence.
- With a **Community** licence, the banner says that the optimizations are not applied, and advises an upgrade to a paid licence.
- With a **Professional** or **Ultimate** licence there is no banner.

The banner follows the licence badge at the moment the dialog opens. [Getting Started with LLVM](../../../LLVM/Getting-Started#availability) says what each edition gets.

## The progress box
{: #the-progress-box }

When the compiler reports progress, the IDE opens a box titled **Compiling...** with a bar,, and the compiler can also fill an item of the status bar with the percentage, such as **LLVM: n%**. The box is modal: the IDE cannot be used until it closes, and it closes by itself when the build ends. Which builds report progress is the compiler's choice. A small project compiled with LLVM takes a fraction of a second, so the box is gone almost at once.

<!-- SHOT building-compiling-box: an LLVM build of a saved project with the progress event held part-way (wrap event_setBuildProgress in the page), the modal Compiling... box with its bar. Why: the box locks the IDE, and the page says so; a reader should know what it looks like. -->

> [!NOTE] BETA 1010
> If another box opens while **Compiling...** is on screen, the end of the build closes that box instead of the progress box, so the other box is lost. The **Compiling...** box stays, with no button, and the IDE cannot be used. Restart the IDE.

## The cache

The compiler keeps a cache of LLVM code, in a process of its own, so that a later build is faster. **Tools → Flush the LLVM compiler cache** ends that process and restarts the compiler from the project in memory, as the console says with `restarting from MEMORY`. The next build compiles everything again and takes longer. **Restart the compiler**, with <kbd>Alt</kbd> held, restarts the cache process too.

## See Also

- [Getting Started with LLVM](../../../LLVM/Getting-Started) -- turning LLVM on, the options and what the LLVM compiler does not support
- [Project Settings](../Project-Settings#compiler-options-build) -- the *Compiler Options* sections
- [IDE Options](../Customising/IDE-Options#compiler-and-llvm) -- the three LLVM options of the IDE
- [Build and Clean](Build-and-Clean) -- the commands that compile
