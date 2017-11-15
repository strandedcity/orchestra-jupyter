({

    mainConfigFile: './appconfig.js',
    baseUrl: '.',
    findNestedDependencies: true,
    out: './dist/testOutput.js',
    name: "app"
})

// See http://requirejs.org/docs/1.0/docs/faq-optimization.html#priority
// this should include a modules: {...} section to control which parts are loaded where. Presumably, I'll have a few:
//
// libraries (jquery + backbone)
// geometry (sisl + wrappers)
// dataflow (models + UI) -- should be separate for now
// UI (threejs + wrappers for dataflow)
//
// to maintain separation of data and view, the 'viewer' package should be dependent on the 'dataflow' and 'geometry' packages, but not the other way around.
// ... is this possible?

//({
//    appDir: "webapp",
//    baseUrl: "scripts",
//    dir: "webapp-build",
//    optimize: "none",
//    modules: [
//        {
//            name: "appcommon"
//        },
//        {
//            name: "page1",
//            exclude: ["appcommon"]
//        },
//        {
//            name: "page2",
//            exclude: ["appcommon"]
//        }
//    ]
//})