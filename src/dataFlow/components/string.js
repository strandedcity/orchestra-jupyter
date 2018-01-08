define([
    "underscore",
    "dataFlow/core",
    "dataFlow/dataTree",
    "dataFlow/dataMatcher",
    // "dataFlow/components/engine"
],function(_,DataFlow,DataTree,DataMatcher){
    var components = {};

    components.StringComponent = DataFlow.Component.extend({
        initialize: function(opts){
            var output = this.createIObjectsFromJSON([
                {shortName: "S", type: DataFlow.OUTPUT_TYPES.STRING, required: true}
            ], opts, "output");

            var inputs = this.createIObjectsFromJSON([
                {required: false, shortName: "S", type: DataFlow.OUTPUT_TYPES.STRING}
            ], opts, "inputs");

            var args = _.extend({
                componentPrettyName: "String"
            }, opts || {},{
                inputs: inputs,
                outputs: output,
                pythonTemplate: "<%= RESULT %> = <%= IN_S %>\n" // OUTPUT = N
            });
            this.base_init(args);
        },
    },{
        "label": "String",
        "desc": "Holds a list of strings. You can use this to copy/paste string data from Google Docs or Excel"
    });

    components.ComparatorComponent = DataFlow.Component.extend({
        initialize: function(opts){

            var inputs = this.createIObjectsFromJSON([
                {required: false, shortName: "C", type: DataFlow.OUTPUT_TYPES.COMPARATOR}
            ], opts, "inputs");

            var output = this.createIObjectsFromJSON([
                {shortName: "C", type: DataFlow.OUTPUT_TYPES.COMPARATOR}
            ], opts, "output");

            var args = _.extend({
                componentPrettyName: "Comparator"
            }, opts || {},{
                inputs: inputs,
                outputs: output,
                pythonTemplate: '<%= RESULT %> = <% var inputString = IN_C.replace(/(^"|"$)/g,""); var op = DATAFLOW.COMPARATORS[inputString] || inputString; print(op) %>\n'
            });
            this.base_init(args);
        },
    },{
        "label": "Comparator",
        "desc": "Holds a list of Comparison functions, such as <, >, ==, !=, etc."
    });


    return components;
});

