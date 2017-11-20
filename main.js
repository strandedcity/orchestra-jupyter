define([
    'base/js/namespace',
    './app',
    "./appconfig"
], function(
    Jupyter,
    Orchestra,
    config
) {

    console.log(arguments)

    // localize "require" to this module
    // Orchestra.setupEngine(Jupyter);

    // This file is the main entry point for Jupyter. It provides access to the notebook object,
    // which probably needs to be passed into orchestra (or glued here) so that things like 'save' and 'run cell'
    // can work.
    //
    // An additional set of APIs to fetch python function signatures would be great (and save writing components
    // for all of python) but ... not critical.

    // Orchestra and Jupyter both have a lot of interaction. Jupyter has a keyboard manager that lets you disable
    // keyboard shortcuts in two possible ways:
    //
    // >> Automatically re-enables on blur, but needs to be applied each time a context menu appears
    // Jupyter.notebook.keyboard_manager.register_events(".context-menu")
    //
    // >> Turns off Jupyter keyboard until further notice. Simpler for my purposes, but I need to be sure to call .enable() when I'm done
    // Jupyter.notebook.keyboard_manager.disable()

    // In the Jupyter context, it might be nice to expose all available variables defined thus far in the ipython notebook
    // as a pre-populated component with a bunch of outputs.
    // The list is easy to gather... dir() >> returns a list of them. Remove anything with underscore prefixes.

    // Glue, so that components can calculate using python

    function load_ipython_extension() {
        console.log(
            'This is the current notebook application instance, as logged from main.js in an extension:',
            Jupyter.notebook
        );

        console.warn("Disabling Jupyter Keyboard Shortcuts for Orchestra");
        Jupyter.notebook.keyboard_manager.disable();

    }

    return {
        load_ipython_extension: load_ipython_extension
    };
});
