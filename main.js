define([
    'base/js/namespace',
    './app'
], function(
    Jupyter,
    orchestra
) {

    console.log(orchestra);

    function load_ipython_extension() {
        console.log(
            'This is the current notebook application instance, as logged from main.js in an extension:',
            Jupyter.notebook
        );
    }

    return {
        load_ipython_extension: load_ipython_extension
    };
});
