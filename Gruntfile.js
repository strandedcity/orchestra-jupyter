module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        requirejs: {
            build: {
                options: {
                    // Somewhere there's some ES6 code that prevents requirejs from optimizing, because it's old.
                    // But I can take the require.js output and just run this on it:
                    // uglifyjs --compress --mangle --output compressed.js -- testOutput.js
                    // reduces size from 1.8 to 1.4mb
                    //
                    /////////////////////////
                    //
                    // TO RUN THE BUILD IN ONE COMMAND:
                    // r.js -o build.js && uglifyjs --compress --mangle --output dist/main.js -- dist/temp.js && rm dist/temp.js

                    // mainConfigFile: './appconfig.js',
                    baseUrl: '.',
                    findNestedDependencies: true,
                    out: './dist/temp.js',
                    name: "main",
                    optimize: 'none', // ES2015 syntax causes problems for the optimizer, so I optimize in a separate step
                    // shim: {
                    //     'threemin': {
                    //         exports: 'THREE'
                    //     }
                    // },
                    paths: {
                        // These libraries are already require()'d by Jupyter in reasonably compatible versions.
                        // No need to build them into the project at this phase, though they are rightly required
                        // by orchestra modules.
                        jquery: "empty:",
                        bootstrap3: 'empty:',
                        bootstrap: 'empty:',
                        'base/js/namespace': 'empty:',
                        'base/js/dialog': 'empty:',

                        // UI
                        viewer: 'src/viewer',
                        // threejs: 'src/viewer/three.wrapper',
                        three: 'src/viewer/three.min',
                        OrbitControls: 'src/viewer/OrbitControls',
                        SVGRenderer: 'src/viewer/SVGRenderer',
                        Projector: 'src/viewer/Projector',
                        navbar: 'src/application/navbar',
                        componentSearcher: 'src/application/componentSearcher',

                        // general libraries
                        // jquery: 'lib/jquery-2.1.1.min', // 'empty:', see above
                        backbone: 'lib/backbone-min',
                        // "parse-lib": 'lib/parse-1.5.0.min',  // no longer a dependency in Orchestra-Jupyter
                        // parse: 'src/dataFlow/parseInitializer', // no longer a dependency in Orchestra-Jupyter
                        underscore: 'lib/underscore-min',
                        // bootstrap3: 'lib/bootstrap.min', // 'empty:', see above
                        'bootstrap3-typeahead': 'lib/bootstrap3-typeahead.min', // https://github.com/bassjobsen/Bootstrap-3-Typeahead
                        'bootstrap-slider': 'lib/bootstrap-slider.min', // https://github.com/seiyria/bootstrap-slider
                        Handsontable: 'lib/handsontable.min',
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
    grunt.registerTask('default', ['clean:pre','requirejs','replace','uglify','clean:post']);

    // Run using 'grunt fastbuild' on the CLI:
    grunt.registerTask('fastbuild', ['clean:pre','requirejs','replace','copy','clean:post']);

};
