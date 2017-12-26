// This config is the same as appconfig.js... but I cannot get it to work loading app config in any other way than directly in this file
require.config({
    // cache busting during development:
    baseUrl: '/nbextensions/orchestra-jupyter/',
    urlArgs: "bust=" + (new Date()).getTime(),

    shim: {
        'backbone': {
            deps: ['underscore', 'jquery'],
            exports: 'Backbone'
        },
        'parse-lib': {
            deps: ['jquery'],
            exports: 'Parse'
        },
        'underscore': {
            exports: '_'
        },
        'jquery': {
            exports: '$'
        },
        'bootstrap3': {
            deps: ['jquery']
        },
        'bootstrap-slider': {
            deps: ['bootstrap']
        },
        'bootstrap3-typeahead': {
            deps: ['bootstrap']
        },
        'OrbitControls': {
            deps: ['three']
        },
        'SVGRenderer': {
            deps: ['three']
        },
        'Projector': {
            deps: ['three']
        },
        'CSS3DRenderer': {
            deps: ['three']
        },
        // 'threemin': {
        //     exports: 'THREE'
        // }
    },

    paths: {
        // UI
        viewer: 'src/viewer',
        // threejs: 'src/viewer/three.wrapper',
        three: 'https://cdn.rawgit.com/strandedcity/orchestra-jupyter/master/src/viewer/three.min',// 'src/viewer/three.min',
        OrbitControls: 'src/viewer/OrbitControls',
        SVGRenderer: 'src/viewer/SVGRenderer',
        Projector: 'src/viewer/Projector',
        navbar: 'src/application/navbar',
        componentSearcher: 'src/application/componentSearcher',

        // general libraries
        jquery: 'lib/jquery-2.1.1.min',
        backbone: 'lib/backbone-min',
        "parse-lib": 'lib/parse-1.5.0.min',
        underscore: 'lib/underscore-min',
        bootstrap3: 'lib/bootstrap.min',
        'bootstrap3-typeahead': 'lib/bootstrap3-typeahead.min', // https://github.com/bassjobsen/Bootstrap-3-Typeahead
        'bootstrap-slider': 'lib/bootstrap-slider.min', // https://github.com/seiyria/bootstrap-slider
        Handsontable: 'https://cdn.rawgit.com/strandedcity/orchestra-jupyter/master/lib/handsontable.min',//'lib/handsontable.min',
        HandsontableWrapper: 'lib/handsontable.wrapper',
        numbro: 'lib/numbro',
        pikaday: 'lib/pikaday',
        moment: 'lib/moment',
        text: 'lib/text',

        // geometry & dataflow
        dataFlow: 'src/dataFlow',
        CSS3DRenderer: 'src/dataFlow/UI/CSS3DRenderer',

        // Application
        orchestraApp: 'app'
    }
});

define([
    'base/js/namespace',
    'orchestraApp',
    'jquery',
    'base/js/dialog',
], function(
    Jupyter,
    OrchestraApplication,
    $,
    dialog
) {

    var ORCHESTRA_HEADS_UP_MESSAGE =
        "### This cell contains Orchestra Visual Flow Programming Project Data. \n"+
        "### Output variables will be defined here for use lower in your notebook. \n"+
        "### Please do not edit this cell's contents directly, as your changes may be overwritten.\n"+
        "###\n"+
        "### If You do not have the Orchestra VFP Extension Installed, please visit:\n"+
        '### https://OrchestraMachineLearning.com/install-jupyter-extension/\n';

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


    var metadata_key = "orchestraData";

    function disableKeyboard() {
        console.warn("Disabling Jupyter Keyboard Shortcuts for Orchestra");
        Jupyter.notebook.keyboard_manager.disable();
    }
    function enableKeyboard() {
        console.warn("Enabling Jupyter Keyboard Shortcuts");
        Jupyter.notebook.keyboard_manager.enable();
    }

    function openProjectAttachToCell(cell){

        // Open, keeping a reference to the cell so we can write python and metadata to it
        console.log("Opening Orchestra Visual Flow Programming");

        // Make sure the user stops interacting with Jupyter
        disableKeyboard();

        // Instantiate the app, load the orchestra project that's in memory
        var orchestra_application = new OrchestraApplication(Jupyter);
        orchestra_application.loadJSON(cell.metadata[metadata_key]);
        cell['orchestra_application'] = orchestra_application;

        orchestra_application.on('change',function (projectData) {
            cell.metadata[metadata_key] = projectData;
        });
        orchestra_application.on('closed',function (projectData) {
            cell.metadata[metadata_key] = projectData;
            enableKeyboard();
        })

        // The "Close" button is in application no-man's land. Don't want to add it to Orchestra (which shouldn't know about its container)
        // But don't want to add it here either.
        // Since this file is the 'glue code', here it goes.
        var closeButton = $('<button class="btn btn-large closeOrchestraButton" style="z-index:500;position: absolute;top: 10px;left: 10px;">Return to Jupyter</button>');
        $('body').append(closeButton);
        closeButton.on('click',function () {
            var transcript = orchestra_application.getTranscript();
            if (transcript.charAt(0) == "#") {
                var spliced = transcript.split("\n");
                spliced.splice(1, 0, ORCHESTRA_HEADS_UP_MESSAGE);
                transcript = spliced.join('\n');
            }


            cell.code_mirror.setValue(transcript);
            orchestra_application.close();
            closeButton.off();
            closeButton.hide(250,function () {
                closeButton.remove();
            });
        })
    }

    function precache(){
        // Powers the excel-like value enterer
        require(['HandsontableWrapper']);
    }


    function load_orchestra_toolbar_button() {
        // register action
        var prefix = 'auto';
        var action_name = 'run-orchestra-vfp';
        var action = {
            icon: 'fa-cubes',
            help: 'Orchestra Visual Flow Programming',
            help_index : 'orchestra',
            handler : function(options){
                // Load assets that orchestra uses, but not right away
                precache();

                // The selected cell is either already an "orchestra"'d cell, or not.
                // If yes, open orchestra + load project from cell metadata
                // If no, open a new project and save it to the cell metadata
                var cell = options.notebook.get_selected_cell(),
                    isOrchestraProject = typeof cell.metadata[metadata_key] === "object";

                if (isOrchestraProject) {
                    openProjectAttachToCell(cell);
                } else {
                    // Convert to an "orchestra" cell? Not a good idea use one cell for orchestra and other data
                    // Warn user first
                    var convertCellText =
                        "<span style='font-size:15px;'>This cell does not have any Orchestra data associated with it. Convert cell now?<br /><br />"+
                        "Cell contents will be overwritten!</span>";

                    function createOrchestraCell(){
                        cell.metadata[metadata_key] = {};
                        cell.code_mirror.setValue(ORCHESTRA_HEADS_UP_MESSAGE);
                        openProjectAttachToCell(cell);
                    }

                    dialog.modal({
                        buttons: {
                            "OK": {
                                "class": "btn btn-primary btn-lg",
                                "click": createOrchestraCell
                            },
                            "Cancel": {
                                "class": "btn btn-lg",
                                "click": function () {}
                            }
                        },
                        title: "Convert Cell?",
                        body: convertCellText,
                        sanitize: false
                    });
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

    }

    return {
        load_ipython_extension: load_orchestra_toolbar_button
    };
});
