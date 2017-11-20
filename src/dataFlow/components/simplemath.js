define([
    "underscore",
    "dataFlow/core",
    "dataFlow/dataTree",
    "dataFlow/dataMatcher"
],function(_,DataFlow,DataTree,DataMatcher){
    var components = {};

    components.NumberAdditionComponent = DataFlow.Component.extend({
        initialize: function(opts){
            var inputs = this.createIObjectsFromJSON([
                {required: true, shortName: "A", type: DataFlow.OUTPUT_TYPES.NUMBER},
                {required: true, shortName: "B", type: DataFlow.OUTPUT_TYPES.NUMBER}
            ], opts, "inputs");

            var output = this.createIObjectsFromJSON([
                {shortName: "N", type: DataFlow.OUTPUT_TYPES.NUMBER}
            ], opts, "output");

            var args = _.extend({
                componentPrettyName: "Number Addition"
            }, opts || {},{
                inputs: inputs,
                outputs: output,
                pythonTemplate: "<%= RESULT %> = <%= IN_A %> + <%= IN_B %>\n" // OUTPUT = A + B
            });
            this.base_init(args);
        }
    },{
        "label": "Add",
        "desc": "Add two numbers together"
    });

    components.NumberSubtractComponent = DataFlow.Component.extend({
        initialize: function(opts){
            var inputs = this.createIObjectsFromJSON([
                {required: true, shortName: "A", type: DataFlow.OUTPUT_TYPES.NUMBER},
                {required: true, shortName: "B", type: DataFlow.OUTPUT_TYPES.NUMBER}
            ], opts, "inputs");

            var output = this.createIObjectsFromJSON([
                {shortName: "N", type: DataFlow.OUTPUT_TYPES.NUMBER}
            ], opts, "output");

            var args = _.extend({
                componentPrettyName: "Number Subtraction"
            }, opts || {},{
                inputs: inputs,
                outputs: output,
                pythonTemplate: "<%= RESULT %> = <%= IN_A %> - <%= IN_B %>\n" // OUTPUT = A + B
            });
            this.base_init(args);
        }
    },{
        "label": "Subtract",
        "desc": "Subtract A - B"
    });



    return components;
});

