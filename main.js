const requireConfigFunction = require.config;
const requireConfig = {
    // cache busting during development:
    baseUrl: '/nbextensions/orchestra-jupyter/',
    urlArgs: "bust=" + (new Date()).getTime(),

    // All third party libraries are built together so the dependencies can be separated.
    // These are then loaded from a CDN, so their download can happen in parallel and to support gzip,
    // which Jupyter doesn't. Additionally, I can create a separate "offline" installation package
    // so that people who want to use the libraries without an internet connection can just install the 'offline' package
    bundles: {
        // Be sure to add libraries to the 'exclude' section in Gruntfile.js also,
        // so they aren't built into the main bundle accidentally
        "libs": [
            'Handsontable',
            'numbro',   // not used in Orchestra, but called out here so it could be. This is a Handsontable dependency
            'pikaday',  // not used in Orchestra, but called out here so it could be. This is a Handsontable dependency
            'moment',   // not used in Orchestra, but called out here so it could be. This is a Handsontable dependency
            'three',
            'backbone',
            'underscore',
            'bootstrap3-typeahead',
            'bootstrap-slider'
        ]
    },

    paths: {
        // general libraries -- ALL MOVED TO 'libs' BUNDLE, AND CONFIGURED IN GRUNTFILE.JS
        // In development, when adding dependencies, it might be better to reverse the order of these
        // includes
        libs: "", // THIS IS FILLED IN AFTER A VALID PATH FOR LIBRARIES IS FOUND, BEFORE REQUIRE.CONFIG() IS CALLED
        HandsontableWrapper: 'lib/handsontable.wrapper',
        text: 'lib/text', // so I can require() CSS. Must be available to the optimizer of the main package, so it needs to be here

        // Customized UI Components (un-customized ones are bundled in libraries)
        OrbitControls: 'src/dataFlow/UI/OrbitControls',
        CSS3DRenderer: 'src/dataFlow/UI/CSS3DRenderer',
        componentSearcher: 'src/application/componentSearcher',

        // Application
        dataFlow: 'src/dataFlow',
        orchestraApp: 'app'
    }
};

define([
    'base/js/namespace',
    'jquery',
    'base/js/dialog',
    'require'
], function(
    Jupyter,
    $,
    dialog,
    require
) {

    // 3rd party libraries are grouped as a separate bundle to shrink build time and enable
    // gzip over the wire, which Jupyter doesn't. The libraries may need to be loaded from different
    // locations, depending on the context. Normal users with internet access will prefer to load libraries
    // from github. Orchestra developers will load from their own "dist" directory. Normal users without
    // internet can attempt to load from a separately installed Jupyter extesion created just for the libraries.
    // So the first task is to choose an available copy of the libraries, then set it in require.config()
    // and proceed to load Orchestra.
    const possibleLibPaths = [
        'https://rawgit.com/strandedcity/orchestra-jupyter/master/dist/orchestra-libraries',    // gzipped, but cached. Versions will eventually need checking for compatibility
        '/nbextensions/orchestra-jupyter/dist/orchestra-libraries',                             // Works in development
        '/nbextensions/orchestra-libraries'                                                     // Installed as a separate extension so Orchestra can be used offline, with no internet connection
    ];

    const getOrchestraObject = new Promise(function (resolve,reject) {
        checkLibPath(0,resolve,reject);
    });

    // must catch errors right away, because otherwise there's an uncaught promise if the user doesn't click the button before dependencies fail to resolve.
    getOrchestraObject
        .catch(function(err){
            console.error(err.message);
        });

    function checkLibPath( idx, resolve, reject ) {
        var jsFile = possibleLibPaths[idx];
        $.ajax({
            url: jsFile + ".js",
            type: "HEAD",
            success: function(){ // 200s only
                // found the library dependencies!
                requireConfig.paths.libs = jsFile;
                requireConfigFunction(requireConfig);

                // Precache Some things.... Precache Handsontable so that the big dependency is ready to go, even in development
                console.log("Found Orchestra Library Dependencies at " + jsFile + ".js");
                require(['HandsontableWrapper','orchestraApp'],function(HandsonTable, OrchestraApplication){
                    resolve(OrchestraApplication);
                },function(){
                    // Require error
                    reject({message: "Error Loading Orchestra Application Files."});
                })
            },
            error: function(){ // we'll see 404s and 405s in here
                if (idx + 1 < possibleLibPaths.length) {
                    // try the next one
                    checkLibPath(idx+1, resolve, reject);
                } else {
                    // all paths have been attempted, and failed.
                    reject({message: "Could not resolve Orchestra's Library Dependencies."});
                }
            }
        })
    }

    var ORCHESTRA_HEADS_UP_MESSAGE =
        "### This cell contains Orchestra Visual Flow Programming Project Data. \n"+
        "### Output variables will be defined here for use lower in your notebook. \n"+
        "### Please do not edit this cell's contents directly, as your changes may be overwritten.\n"+
        "###\n"+
        "### If You do not have the Orchestra VFP Extension Installed, please visit:\n"+
        '### https://OrchestraMachineLearning.com/install-jupyter-extension/\n';


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
        getOrchestraObject
            .then(function(OrchestraApplication){
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
            });
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
    }

    return {
        load_ipython_extension: load_orchestra_toolbar_button
    };
});
