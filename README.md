Multimodal Interaction Library
====

The Multimodal Interaction Library is a library containing basic controls to create multimodal applications. It includes radial menus to create pen and touch applications and a very simple sandbox whiteboard application.
constraints.

Project Team
----

- [Michel Pahud](http://research.microsoft.com/en-us/um/people/mpahud/)
- [Bongshin Lee](http://research.microsoft.com/en-us/um/people/bongshin/)
- [Ken Hinckley](http://research.microsoft.com/en-us/um/people/kenh/)

Build
----

Permissions settings

Open a PowerShell as administrator and enter the following:

```bash
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine
```

Answer *'A' (Yes to All)* to the question *Do you want to change the execution policy?*


Download or Clone the source code from GitHub

In VSCode do the following in the menu:

- File > Open Folder
- Select the folder 'multimodal-interaction-library'


TypeScript settings

Open a terminal in VS Code, by selectting the following in the menu:

- Terminal > New Terminal

and enter the following command:

```bash
npm install
```

Compile the TypeScript code

With the sandbox you can recreate the files *multimodal-interaction-library\MIL_Lib\Scripts\MIL.js* and *MIL.js.map* (and *MIL.d.ts*) by doing the following in VSCode:

```bash
npm run build
```




Testing the sandbox
----

To launch the sandbox sample, do the following:

- Install the VS Code extension 'open in browser' if not already installed

- Right click on the file MIL_Lib\MIL_Sandbox.html and select 'Open In Default Browser'

You should see a simplified whiteboard with two radial menus. One radial menu for the pen color (initially placed on the left) and one control radial menu to toggle a ruler and undo (initially placed on the right).

The figures below show snapshots of the sandbox sample. From left to right, the two radial menus collapsed, the pen color radial menu expanded, the ruler visible with the control radial menu expanded.

![Sandbox](Sandbox.png)

You can then consume these radial menus in 8 directions (cardinal directions and intermediate directions) with a pen by doing a ballistic movement starting from the center of the menu toward one of the 8 directions.

For instance, to modify the color of the pen to fine red do the following:

- Gesture with the pen from the center of the pen color radial menu toward right.

Now the ink should be fine red if you write with the pen on the sandbox.

You can also toggle on and off a multi-touch ruler by doing the following:

- Gesture with the pen from the center of the control radial menu in diagonal toward top left.

The control radial menu also allows to undo strokes by doing the following:

- Gesture with the pen from the center of the control radial menu in diagonal toward top.

In addition, the radial menus can be moved on the screen by dragging them with the finger.

Other features you can test:

- A single finger touch on the canvas allows panning,
- pinch on the canvas allows zooming,
- finger touch on a stroke allows dragging it,
- and earaser of the pen allows earasing a portion of a stroke.

> Note about the sample: The radial menus can only be consumed with pen (not with mouse or touch).


# Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.microsoft.com.

When you submit a pull request, a CLA-bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., label, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

# Documentation

Run `yarn typedoc` to generate documentation pages.
The page will be available in [`./docs/multimodal-interaction-library`](./docs/multimodal-interaction-library/index.html)

Start point of documentation is index page {@link "index"}