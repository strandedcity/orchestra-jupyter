# Orchestra Visual Flow Programming
Orchestra VFP is a plugin for Python3 [Jupyter Notebooks](https://jupyter-notebook.readthedocs.io/en/stable/notebook.html) that enables data scientists and others less familiar with the Python Data Science toolchain to powerfully leverage the full range of data munging and (eventaully) machine learning tasks supported by Python itself.

Users more deeply familiar with Python code can use a hybrid workflow that "exports" python variables directly to the notebook in which Orchestra definitions are created.

Even as Orchestra offers greatly increased accessibility for data manipulation tasks, it does not force any compromises on those who wish to use the full power of Python.

### Installation

Assuming you already have Jupyter and Python3 Installed, just run these commands:

```bash
jupyter nbextension install https://rawgit.com/strandedcity/orchestra-jupyter/master/dist/orchestra.js
jupyter nbextension install https://rawgit.com/strandedcity/orchestra-jupyter/master/dist/orchestra-libraries.js
jupyter nbextension enable orchestra
```

Expect to see this output:
```bash
# Downloading: https://rawgit.com/strandedcity/orchestra-jupyter/master/dist/orchestra.js -> /var/folders/sc/ps6q4zys24x3s4p711n8ltbw0000gp/T/tmps1m0cvrj/orchestra.js
# Copying: /var/folders/sc/ps6q4zys24x3s4p711n8ltbw0000gp/T/tmps1m0cvrj/orchestra.js -> /usr/local/share/jupyter/nbextensions/orchestra.js
# Enabling notebook extension orchestra...
#      - Validating: OK
```

And you're done! The next time you load a Jupyter Notebook, you'll have this icon available:
![image](https://user-images.githubusercontent.com/1693906/34459711-f5342122-edac-11e7-8f88-de873856b5a9.png)

Click it, and you're off to the races.

### Developers
#### Environment Setup

- The dev environment is very similar to the "production" environment, except you're using un-optimized versions of the code. To get started, clone this repo to a location of your choice (here, I assume your home directory), and install its "main" module as a Jupyter extension:

```bash
cd /path/to/containing/folder
git clone git@github.com:strandedcity/orchestra-jupyter.git
jupyter nbextension install /path/to/containing/folder/orchestra-jupyter --symlink
jupyter nbextension enable orchestra-jupyter/main
```

- Note that you cannot run both development and built copies of Orchestra side by side. So if you previously installed Orchestra via the instructions above, you'll need to:

```bash
jupyter nbextension disable orchestra
```

- Otherwise, you'll see this in your JavaScript console when starting Jupyter:

```
Uncaught SyntaxError: Identifier 'requireConfigFunction' has already been declared
    at orchestra.js?v=20171221222403:1
```

#### Building the JavaScript

- You will only need to build the JavaScript if you want to submit your code back to the main repo. To do so, you'll need a few npm dependencies:

```bash
npm install -g grunt-cli
cd /path/to/orchestra
npm install

# To build everything:
grunt

# To build only Orchestra (not its third-party dependencies):
grunt buildOrchestra

# To build only third-party libraries (not Orchestra code):
grunt buildLibraries
```

### License
[![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc/4.0/)

Orchestra Visual Flow Programming is Copyright 2017 Phil Seaton. https://www.phil-seaton.com.

Please note the [license](LICENSE.md) for Orchestra before you use or modify it. Orchestra is Licensed under the [Creative Commons Attribution-NonCommercial 4.0 International License.](https://creativecommons.org/licenses/by-nc/4.0/) _Orchestra is free to use for non-commercial projects only, and modifications using Orchestra source may not be sold under any circumstances._ Commercial licenses of Orchestra can be purchased for a reasonable fee, and may be offered in exchange for contribution to the Orchestra project. Please visit https://orchestravisualprogramming.com for more information.

Orchestra makes use of several third-party libraries, all of which are open-source projects under the MIT License or similarly permissive open-source licenses that do not restrict usage or modification:

- [ThreeJS](https://github.com/mrdoob/three.js)
- [Handsontable Community Edition](https://github.com/handsontable/handsontable)
- [Numbro](https://github.com/BenjaminVanRyseghem/numbro)
- [Pikaday](https://github.com/dbushell/Pikaday)
- [Moment](https://github.com/moment/moment)
- [Backbone](https://github.com/jashkenas/backbone)
- [Underscore](https://github.com/jashkenas/underscore)
- [Bootstrap3-Typeahead](https://github.com/bassjobsen/Bootstrap-3-Typeahead) (Apache 2.0 License)
 
The following are also dependencies, but are included already in Jupyter:
JQuery, Bootstrap, RequireJS