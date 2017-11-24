define([
    'base/js/namespace',
    './app',
    "./appconfig",

    'jquery',
    'base/js/dialog',
    'base/js/events',
    'notebook/js/celltoolbar',
    'notebook/js/codecell',
], function(
    Jupyter,
    Orchestra,
    config,
    $,
    dialog,
    events,
    celltoolbar,
    codecell
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

    
    // var CellToolbar = celltoolbar.CellToolbar;
    // var toolbar_preset_name = 'Initialization Cell';
    // var init_cell_ui_callback = CellToolbar.utils.checkbox_ui_generator(
    //     toolbar_preset_name,
    //     function setter (cell, value) {
    //         if (value) {
    //             cell.metadata.init_cell = true;
    //         }
    //         else {
    //             delete cell.metadata.init_cell;
    //         }
    //     },
    //     function getter (cell) {
    //         // if init_cell is undefined, it'll be interpreted as false anyway
    //         return cell.metadata.init_cell;
    //     }
    // );
    // var callback_notebook_loaded = init_cell_ui_callback;


    function load_ipython_extension() {
        // register action
        var prefix = 'auto',
            metadata_key = "orchestraData";
        var action_name = 'run-initialization-cells';
        var action = {
            icon: 'fa-cubes',
            help: 'Orchestra Visual Flow Programming',
            help_index : 'orchestra',
            handler : function(options){

                // The selected cell is either already an "orchestra"'d cell, or not.
                // If yes, open orchestra + load project from cell metadata
                // If no, open a new project and save it to the cell metadata
                var cell = options.notebook.get_selected_cell(),
                    isOrchestraProject = typeof cell.metadata[metadata_key] === "object";

                 if (isOrchestraProject) {
                    // Open, keeping a reference to the cell so we can write python and metadata to it
                    console.log("Already an orchestra project. Open Orchestra now...")
                    console.log(cell);
                    console.log(cell.metadata)
                } else {
                    // Convert to an "orchestra" cell? Not a good idea use one cell for orchestra and other data
                    var convertCell = confirm(
                        "This cell does not have any Orchestra data associated with it. \n\n"+
                        "Convert cell now?\n\n"+
                        "Cell contents will be overwritten!"
                    );
                    if (convertCell) {
                        console.log("Converting now...")
                        cell.metadata[metadata_key] = {};
                        cell.code_mirror.setValue(
                            "### This cell holds Orchestra Visual Flow Programming Project Data. \n"+
                            "### Output variables will be defined here for use lower in your notebook. \n"+
                            "### Please do not edit this cell's contents directly, as your changes will be overwritten."
                        );
                        console.log(cell)
                    }
                }


            }
        };
        var action_full_name = Jupyter.notebook.keyboard_manager.actions.register(action, action_name, prefix);

        // add toolbar button
        Jupyter.toolbar.add_buttons_group([action_full_name]);

        // // register celltoolbar presets if they haven't been already
        // if (CellToolbar.list_presets().indexOf(toolbar_preset_name) < 0) {
        //     // Register a callback to create a UI element for a cell toolbar.
        //     CellToolbar.register_callback('init_cell.is_init_cell', init_cell_ui_callback, 'code');
        //     // Register a preset of UI elements forming a cell toolbar.
        //     CellToolbar.register_preset(toolbar_preset_name, ['init_cell.is_init_cell'], Jupyter.notebook);
        // }
        //
        // // setup things to run on loading config/notebook
        // Jupyter.notebook.config.loaded
        //     .then(function () {
        //         if (Jupyter.notebook._fully_loaded) {
        //             callback_notebook_loaded();
        //         }
        //         events.on('notebook_loaded.Notebook', callback_notebook_loaded);
        //     }).catch(function (reason) {
        //     console.error(log_prefix, 'unhandled error:', reason);
        // });



        console.warn("Disabling Jupyter Keyboard Shortcuts for Orchestra");
        Jupyter.notebook.keyboard_manager.disable();

    }

    return {
        load_ipython_extension: load_ipython_extension
    };
});
