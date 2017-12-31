module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        requirejs: {
            "buildLibraries": {
                options: {
                    baseUrl: '.',
                    findNestedDependencies: false,
                    out: './dist/orchestra-libraries.js',
                    optimize: 'none',
                    paths: {
                        three: 'lib/three.min',
                        Handsontable: 'lib/handsontable.min',
                        numbro: 'lib/numbro',
                        pikaday: 'lib/pikaday',
                        moment: 'lib/moment',

                        backbone: 'lib/backbone-min',
                        underscore: 'lib/underscore-min',

                        // UI Helpers
                        'bootstrap3-typeahead': 'lib/bootstrap3-typeahead.min', // https://github.com/bassjobsen/Bootstrap-3-Typeahead
                        //'bootstrap-slider': 'lib/bootstrap-slider.min', // https://github.com/seiyria/bootstrap-slider // commenting out 12/30/17 because this is broken anyways

                        // These libraries inherit from Jupyter, but would be required in any other context
                        jquery: "empty:",       // jquery: 'lib/jquery-2.1.1.min',
                        bootstrap3: 'empty:',   // bootstrap3: 'lib/bootstrap.min',
                        bootstrap: 'empty:',    // bootstrap3: 'lib/bootstrap.min',
                        'base/js/namespace': 'empty:',
                        'base/js/dialog': 'empty:',
                    },
                    shim: {
                        // 'jquery': {
                        //     exports: '$'
                        // },
                        // 'bootstrap3': {
                        //     deps: ['jquery']
                        // },
                        'backbone': {
                            deps: ['underscore', 'jquery'],
                            exports: 'Backbone'
                        },
                        'underscore': {
                            exports: '_'
                        },
                        'bootstrap-slider': {
                            deps: ['bootstrap']
                        },
                        'bootstrap3-typeahead': {
                            deps: ['bootstrap']
                        }
                    },
                    include: [
                        'three',
                        'Handsontable',
                        'backbone',
                        'underscore',
                        'moment',
                        'pikaday',
                        'numbro',
                        'bootstrap3-typeahead',
                        'bootstrap-slider'
                    ],
                    fileExclusionRegExp: /src|dataFlow/
                }
            },
            build: {
                options: {
                    // Somewhere there's some ES6 code that prevents requirejs from optimizing, because it's old.
                    // So we 'optimize -> none' here, then uglify separately below
                    baseUrl: '.',
                    findNestedDependencies: true,
                    out: './dist/temp.js',
                    name: "main",
                    optimize: 'none', // ES2015 syntax causes problems for the optimizer, so I optimize in a separate step
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
                        libs: 'empty:', // this is the OUTPUT of `grunt buildLibraries`. Use CDN first, so gzip happens, then try local
                        jquery: "empty:",       // jquery: 'lib/jquery-2.1.1.min',
                        bootstrap3: 'empty:',   // bootstrap3: 'lib/bootstrap.min',
                        bootstrap: 'empty:',    // bootstrap3: 'lib/bootstrap.min',
                        'base/js/namespace': 'empty:',
                        'base/js/dialog': 'empty:',
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
                }
            }
        },
        uglify: {
            build: {
                src: 'dist/temp.js',
                dest: 'dist/orchestra.js'
            },
            options: {
                beautify: false,
                mangle: true,
                compress: true
            }
        },
        copy: {
            main: {
                // Used instead of uglify for buliding fast
                src: 'dist/temp.js',
                dest: 'dist/orchestra.js'
            }
        },
        replace: {
            anonymizeMain: {
                src: ['dist/temp.js'],
                overwrite: true,
                replacements: [{
                    from: /define\(('|")main('|"),/,  // Doesn't work to have the main module defined in Jupyter
                    to: 'define('
                }]
            }
        },
        clean: {
            pre: ['dist/*'],
            post: ['dist/temp.js']
        }
    });

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-requirejs')
    grunt.loadNpmTasks('grunt-text-replace');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');

    // Default task(s). Run using "grunt" without any parameters
    grunt.registerTask('default', ['clean:pre','requirejs:buildLibraries','requirejs:build','replace','uglify','clean:post']);

    // Run using 'grunt fastbuild' on the CLI:
    grunt.registerTask('buildOrchestra', ['clean:pre','requirejs:build','replace','uglify','copy','clean:post']);

    grunt.registerTask('buildLibraries', ['clean:pre','requirejs:buildLibraries'])

};
