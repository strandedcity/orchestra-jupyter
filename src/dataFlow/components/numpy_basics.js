define([
    "underscore",
    "dataFlow/core",
    "dataFlow/dataTree",
    "dataFlow/dataMatcher"
],function(_,DataFlow,DataTree,DataMatcher){
    var components = {};

    components.NumpySlice = DataFlow.Component.extend({
        initialize: function(opts){
            var inputs = this.createIObjectsFromJSON([
                {required: true, shortName: "A", type: DataFlow.OUTPUT_TYPES.NUMPY_ARR, desc: "Numpy Array to Slice"},
                {required: false, default: 'null', shortName: "S", type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "Start Index of Slice"}, // default to null so that numpy defaults can be used instead
                {required: false, default: 'null', shortName: "E", type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "End Index of Slice"},
                {required: false, default: 'null', shortName: "N", type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "Step"}
            ], opts, "inputs");

            var output = this.createIObjectsFromJSON([
                {shortName: "A", type: DataFlow.OUTPUT_TYPES.NUMPY_ARR}
            ], opts, "output");

            var args = _.extend({
                componentPrettyName: "Sub Array"
            }, opts || {},{
                inputs: inputs,
                outputs: output,
                pythonTemplate: "<%= RESULT %> = <%= IN_A %>[ <% if (IN_S != 'null'){ %><%= IN_S %><% } %> : <% if (IN_E != 'null'){ %><%= IN_E %><% } %> : <% if (IN_N != 'null'){ %><%= IN_N %><% } %>]\n"
            });

            this.base_init(args);
        }
    },{
        "label": "Slice a Numpy Array",
        "desc": "Create a slice (sub-array) of a numpy array based on a start index, end index, and number of steps between each index."
    });



    components.NumpyShape = DataFlow.Component.extend({
        initialize: function(opts){
            var inputs = this.createIObjectsFromJSON([
                {required: true, shortName: "A", type: DataFlow.OUTPUT_TYPES.NUMPY_ARR, desc: "Numpy Array"}
            ], opts, "inputs");

            var output = this.createIObjectsFromJSON([
                {shortName: "S", type: DataFlow.OUTPUT_TYPES.ARRAY, desc: "Shape"},
                {shortName: "N", type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "Number of Dimensions"},
                {shortName: "C", type: DataFlow.OUTPUT_TYPES.NUMBER, desc: "Size"},
                {shortName: "D", type: DataFlow.OUTPUT_TYPES.STRING, desc: "Data Type"}
            ], opts, "output");

            var args = _.extend({
                componentPrettyName: "Shape"
            }, opts || {},{
                inputs: inputs,
                outputs: output,
                pythonTemplate: "<%= RESULT %> = (<%= IN_A %>.shape, <%= IN_A %>.ndim, <%= IN_A %>.size, <%= IN_A %>.dtype)\n"
            });

            this.base_init(args);
        }
    },{
        "label": "Shape of a Numpy Array",
        "desc": "Retrieve the dimensions and data type of a Numpy Array"
    });


    // TODO: INDEXING
    // TODO: SLICING HIGHER-DIM ARRAYS?

    return components;
});

